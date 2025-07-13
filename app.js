const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxIDJqm8CchVwXNL2t4JvNgHVcpfh8l8QMVS-3mXQJO1FrxiT7fi9HI24k8KsoUUuxu/exec'

/**
 * Memanggil Apps Script lewat fetch dengan action + payload.
 * @param {string} action  — nama case di doPost(e)
 * @param {object} payload — data yang dikirim
 * @returns {Promise<any>} hasil data.status==='ok' ? data.data
 */
async function callGAS(action, payload = {}) {
  const res = await fetch(GAS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(json.message || 'GAS error');
  return json.data;
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

  document.getElementById("tanggalHariIni").innerText = new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric"
});
});

function tampilkanBeranda(nama) {
  document.getElementById('halamanLogin').style.display = 'none';
  document.getElementById('halamanBeranda').style.display = 'block';
  document.getElementById('tampilNamaGuru').innerText = nama;
}

// Navigasi menu

// Menu grid klik → ubah ke tampilan menu horizontal + konten
document.querySelectorAll('.menu-item').forEach(menu => {
  menu.addEventListener('click', () => {
    const targetId = menu.getAttribute('data-target');
    const label = menu.innerText.trim();

    // Sembunyikan konten beranda (kecuali salam dan marquee)
    document.getElementById("kontenBerandaUtama").style.display = "none";
    document.getElementById("gridMenuBeranda").style.display = "none";

    // Tampilkan menu horizontal (sekali saja dibuat)
    const menuHor = document.getElementById("menuHorizontal");
if (menuHor.innerHTML.trim() === "") {
  // Tambahkan tombol "Beranda"
  const btnHome = document.createElement("div");
  btnHome.className = "tab-menu";
  btnHome.innerHTML = `<i class="fas fa-home icon-menu"></i><br>Beranda`;
  btnHome.addEventListener("click", () => {
    // Tampilkan kembali tampilan awal
    document.getElementById("kontenBerandaUtama").style.display = "block";
    document.getElementById("gridMenuBeranda").style.display = "grid";
    document.getElementById("menuHorizontal").style.display = "none";
    document.getElementById("presensiSantri").style.display = "none";
  });
  menuHor.appendChild(btnHome);

  // Tambahkan tombol menu lainnya dengan ikon
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

    // Tampilkan konten pertama
// Cari tombol horizontal yang sesuai, lalu aktifkan
const tombolAktif = Array.from(menuHor.children).find(btn =>
  btn.getAttribute("data-tab") === targetId
);
tampilkanKontenMenu(targetId, tombolAktif);
  });
});

// Fungsi tampilkan konten menu aktif
function tampilkanKontenMenu(idKonten, tombol) {
  document.getElementById("presensiSantri").style.display = "block";
  document.getElementById("kontenBerandaUtama").style.display = "none";
  document.getElementById("gridMenuBeranda").style.display = "none";

  // Highlight tombol aktif
  document.querySelectorAll(".tab-menu").forEach(btn => btn.classList.remove("aktif"));
  if (tombol) tombol.classList.add("aktif");
}




// Tampilkan tanggal hari ini


// Grafik dummy santri putra & putri
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
    animation: {
      duration: 1500
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});

// Aktifkan scroll horizontal dengan mouse
const menuHorizontal = document.getElementById('menuHorizontal');
menuHorizontal.addEventListener('wheel', function (e) {
  if (e.deltaY !== 0) {
    e.preventDefault();
    menuHorizontal.scrollLeft += e.deltaY;
  }
});


