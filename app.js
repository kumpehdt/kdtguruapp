const GAS_ENDPOINT = 'https://script.google.com/macros/s/NEW_ENDPOINT_ID/exec'; // Ganti dengan endpoint GAS Anda

async function callGAS(action, payload = {}) {
  try {
    const res = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload })
    });
    const json = await res.json();
    if (json.status !== 'success') throw new Error(json.message || 'GAS error');
    return json.data;
  } catch (error) {
    console.error('GAS Error:', error);
    // Simpan ke IndexedDB jika offline
    if (!navigator.onLine) {
      await savePresensiOffline({ action, payload });
      alert('Data disimpan secara offline dan akan disinkronkan saat online.');
    }
    throw error;
  }
}

// Fungsi untuk menyimpan data ke IndexedDB saat offline
async function savePresensiOffline(data) {
  const db = await openDB('kdt-guru-db', 1, {
    upgrade(db) {
      db.createObjectStore('presensi', { keyPath: 'id', autoIncrement: true });
    }
  });
  await db.put('presensi', data);
}

// Sinkronkan data offline saat online
async function syncPresensi() {
  const db = await openDB('kdt-guru-db', 1);
  const tx = db.transaction('presensi', 'readwrite');
  const store = tx.objectStore('presensi');
  const allData = await store.getAll();
  for (const data of allData) {
    try {
      await callGAS(data.action, data.payload);
      await store.delete(data.id);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const namaGuru = localStorage.getItem('namaGuru');
  if (namaGuru) {
    tampilkanBeranda(namaGuru);
  } else {
    document.getElementById('halamanLogin').style.display = 'block';
  }

  document.getElementById('formLogin').addEventListener('submit', function(e) {
    e.preventDefault();
    const nama = document.getElementById('namaGuru').value.trim();
    if (nama !== '') {
      localStorage.setItem('namaGuru', nama);
      tampilkanBeranda(nama);
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('namaGuru');
    location.reload();
  });

  document.getElementById("tanggalHariIni").innerText = new Date().toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  // Contoh: Ambil jadwal guru dari GAS
  async function loadJadwalGuru() {
    try {
      const data = await callGAS('getJadwalGuru');
      const jadwalList = document.querySelector('#kontenBerandaUtama ul');
      jadwalList.innerHTML = data.jadwal.map(jadwal => `<li>${jadwal}</li>`).join('');
    } catch (error) {
      console.error('Gagal memuat jadwal:', error);
    }
  }
  loadJadwalGuru();
});

function tampilkanBeranda(nama) {
  document.getElementById('halamanLogin').style.display = 'none';
  document.getElementById('halamanBeranda').style.display = 'block';
  document.getElementById('tampilNamaGuru').innerText = nama;
}

document.querySelectorAll('.menu-item').forEach(menu => {
  menu.addEventListener('click', () => {
    const targetId = menu.getAttribute('data-target');
    const menuHor = document.getElementById("menuHorizontal");
    if (menuHor.innerHTML.trim() === "") {
      const btnHome = document.createElement("div");
      btnHome.className = "tab-menu";
      btnHome.innerHTML = `<i class="fas fa-home icon-menu"></i><br>Beranda`;
      btnHome.addEventListener("click", () => {
        document.getElementById("kontenBerandaUtama").style.display = "block";
        document.getElementById("gridMenuBeranda").style.display = "grid";
        document.getElementById("menuHorizontal").style.display = "none";
        document.getElementById("presensiSantri").style.display = "none";
      });
      menuHor.appendChild(btnHome);

      document.querySelectorAll('.menu-item').forEach(m => {
        const label = m.innerText.trim();
        const target = m.getAttribute('data-target');
        const ikon = m.querySelector("i").className;
        const btn = document.createElement("div");
        btn.className = "tab-menu";
        btn.innerHTML = `<i class="${ikon} icon-menu"></i><br>${label}`;
        btn.setAttribute("data-tab", target);
        btn.addEventListener("click", () => tampilkanKontenMenu(target, btn));
        menuHor.appendChild(btn);
      });
    }

    document.getElementById("menuHorizontal").style.display = "flex";
    const tombolAktif = Array.from(menuHor.children).find(btn => btn.getAttribute("data-tab") === targetId);
    tampilkanKontenMenu(targetId, tombolAktif);
  });
});

function tampilkanKontenMenu(idKonten, tombol) {
  document.getElementById("presensiSantri").style.display = "block";
  document.getElementById("kontenBerandaUtama").style.display = "none";
  document.getElementById("gridMenuBeranda").style.display = "none";
  document.querySelectorAll(".tab-menu").forEach(btn => btn.classList.remove("aktif"));
  if (tombol) tombol.classList.add("aktif");
}

const ctx = document.getElementById('grafikSantri').getContext('2d');
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Putra', 'Putri'],
    datasets: [{
      label: 'Jumlah Santri',
      data: [180, 160],
      backgroundColor: ['#4caf50', '#f06292']
    }]
  },
  options: {
    responsive: true,
    animation: { duration: 1500 },
    scales: { y: { beginAtZero: true } }
  }
});

const menuHorizontal = document.getElementById('menuHorizontal');
menuHorizontal.addEventListener('wheel', function(e) {
  if (e.deltaY !== 0) {
    e.preventDefault();
    menuHorizontal.scrollLeft += e.deltaY;
  }
});

// Daftarkan Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/serviceWorker.js')
      .then(registration => console.log('Service Worker registered:', registration))
      .catch(error => console.error('Service Worker registration failed:', error));
  });
}

// Sinkronkan data saat online
window.addEventListener('online', syncPresensi);

// Tambahkan dependensi IndexedDB
importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd.js');