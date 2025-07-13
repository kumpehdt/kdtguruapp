  let loadingCount = 0;
  let defaultGuru = '';
  let presensiData = [];
  let dropdownData; // Store the loaded data globally
let isDropdownLoading = false;


  function showLoading(message) {
    loadingCount++;
    document.getElementById('loading').style.display = 'block';
    document.getElementById('loadingMessage').textContent = message;
  }

  function hideLoading() {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount === 0) {
      document.getElementById('loading').style.display = 'none';
    }
  }

  function setTodayDate() {
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
  }


async function loadDropdownData() {
  showLoading('Memuat data dropdown...');
  try {
    const data = await callGAS('loadDropdownData');
    dropdownData = data; // Save data globally for later use

      // Mengisi dropdown untuk Guru
      const guruSelect = document.getElementById('guruId');
      const popupGuruSelect = document.getElementById('popupGuruId');
      if (guruSelect && popupGuruSelect) {
        const fragment = document.createDocumentFragment();
        const popupFragment = document.createDocumentFragment();
        data.guruData.slice(1).forEach(guru => {
          const [id, name] = guru; // Asumsikan data guru ada di kolom A dan B
          fragment.appendChild(new Option(name, id));
          popupFragment.appendChild(new Option(name, id));
        });
        guruSelect.innerHTML = '';
        popupGuruSelect.innerHTML = '';
        guruSelect.appendChild(fragment);
        popupGuruSelect.appendChild(popupFragment);

        const savedGuru = localStorage.getItem('selectedGuru');
        if (savedGuru) {
          guruSelect.value = savedGuru;
          popupGuruSelect.value = savedGuru;
          updateScheduleTable(); // Memuat mata pelajaran saat guru dipilih
        }
      }

      hideLoading();
  } catch (err) {
    console.error(err);
    showPopupMessage('Gagal memuat dropdown: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

function updateMataPelajaran() {
  const guruId = document.getElementById('guruId').value;
  const mataPelajaranSelect = document.getElementById('mataPelajaran');
  mataPelajaranSelect.innerHTML = '<option value="">Pilih Mata Pelajaran</option>';

  if (guruId && dropdownData) {
    showLoading('Memuat data Mata Pelajaran.....');

    // Ambil data mata pelajaran berdasarkan Guru ID dan hapus duplikat
    const mataPelajaranList = Array.from(new Set(
      dropdownData.mataPelajaranData
        .filter(mp => mp[0] === guruId) // Filter berdasarkan Guru ID
        .map(mp => mp[1]) // Ambil nama mata pelajaran
    ));

    // Hapus opsi 'Semua Pelajaran' jika ada
    mataPelajaranSelect.innerHTML += mataPelajaranList
      .filter(mp => mp !== 'Semua Pelajaran')
      .map(mp => `<option value="${mp}">${mp}</option>`)
      .join('');
    
    hideLoading();
  } else {
    hideLoading();
  }

  clearPresensiTable();
}



function updateKelas() {
  const guruId = document.getElementById('guruId').value;
  const mataPelajaran = document.getElementById('mataPelajaran').value;
  const kelasSelect = document.getElementById('kelas');
  kelasSelect.innerHTML = '<option value="">Pilih Kelas</option>';

  // Ensure dropdownData and mataPelajaranData are defined
  if (guruId && mataPelajaran && dropdownData && dropdownData.mataPelajaranData) {
    showLoading('Memuat data Kelas.....');
    
    const kelasList = dropdownData.mataPelajaranData
      .filter(mp => mp[0] === guruId && mp[1] === mataPelajaran) // Filter data by Guru ID and Mata Pelajaran
      .map(mp => mp[2]); // Assume Kelas is in the third column

    kelasSelect.innerHTML += kelasList
      .map(kelas => `<option value="${kelas}">${kelas}</option>`)
      .join('');
    hideLoading();
  } else {
    console.warn('dropdownData or mataPelajaranData is undefined');
    hideLoading();
  }

  // Clear or hide attendance data table
  clearPresensiTable();
}

// Utility: konversi yyyy‑MM‑dd → nama hari dalam Bahasa Indonesia
function getDayName(dateStr) {
  const nama = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const d = new Date(dateStr);
  return nama[d.getDay()];
}

function updateScheduleTable() {
  const guruId = document.getElementById('guruId').value;
  const tanggal = document.getElementById('date').value;
  const hariDipilih = tanggal ? getDayName(tanggal) : null;
  const tbody = document.querySelector('#scheduleTable tbody');

  tbody.innerHTML = '';
  clearPresensiTable();
  document.getElementById('pesanStatusGuru').innerHTML = '';
  if (!guruId || !hariDipilih || !dropdownData) return;

  // Filter: hanya baris yang idGuru cocok & row[0] (Hari) cocok
  const jadwal = dropdownData.mataPelajaranData
    .slice(1)  // skip header
    .filter(row =>
      row[6] === guruId     &&   // idGuru
      row[0] === hariDipilih     // Hari
    );

  if (jadwal.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#888">
      Tidak ada jadwal pada hari ${hariDipilih}.
    </td></tr>`;
    return;
  }

  jadwal.forEach((row, idx) => {
    const jamKe = row[1];
    const kelas = row[2];
    const mapel = row[3];
    const waktu = row[7];  // kolom H
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="radio" name="schedule"
            data-mapel="${mapel}"
            data-kelas="${kelas}"
            data-waktu="${waktu}"
            ${idx===0?'checked':''}></td>
      <td>${waktu}</td>
      <td>${kelas}</td>
      <td>${mapel}</td>
    `;
    tbody.appendChild(tr);
  });

  applySelectedSchedule();

  tbody.querySelectorAll('input[name="schedule"]').forEach(radio => {
    radio.addEventListener('change', applySelectedSchedule);
  });
}


function applySelectedSchedule() {
  const sel = document.querySelector('input[name="schedule"]:checked');
  if (!sel) return;

  // Set hidden fields
  document.getElementById('mataPelajaran').value = sel.dataset.mapel;
  document.getElementById('kelas').value = sel.dataset.kelas;
  document.getElementById('waktu').value = sel.dataset.waktu;

  // Tampilkan ulang presensi (cek status guru + render)
  cekStatusDanTampilkanPresensi();
}


function cekStatusDanTampilkanPresensi() {
  const guruSelect = document.getElementById('guruId');
      const guruId = guruSelect.value;
      const guruName = guruSelect.options[guruSelect.selectedIndex].textContent;
  const tanggal = document.getElementById('date').value;
  const kelas = document.getElementById('kelas').value;
  const pelajaran = document.getElementById('mataPelajaran').value;

  if (!guruId || !tanggal || !kelas || !pelajaran) {
 console.log('Validasi gagal: Mohon lengkapi semua field');
 return;
  }
  

  showLoading('Memeriksa kehadiran guru...');
  
  google.script.run.withSuccessHandler(status => {
    console.log(`Status presensi ${guruName} pada ${tanggal} kelas ${kelas} mapel ${pelajaran}: ${status ? status : 'Tidak ditemukan'}`);
    const pesan = document.getElementById('pesanStatusGuru');
    const isTidakHadir = status && status.toLowerCase() !== 'hadir';

    if (isTidakHadir) {
      pesan.innerHTML = `
        <span style="color: red;">
          Maaf, ${guruName} tercatat <strong>${status}</strong> pada tanggal ${tanggal}.<br>
          Oleh karena itu, presensi santri tidak dapat dicatat dan diambil alih oleh Petugas Presensi.
        </span>`;
    } else {
      pesan.innerHTML = ''; // Bersihkan pesan
    }

    // Simpan status ke global agar bisa digunakan di renderPresensiTable
    window.guruTidakHadir = isTidakHadir;

    // Panggil fungsi utama
    displayPresensiData();
  }).withFailureHandler(error => {
    showPopupMessage('Gagal memeriksa status guru: ' + error.message, 'error');
    hideLoading();
  }).cekStatusPresensiGuru(tanggal, guruId, pelajaran, kelas);
}

function setTableDisabled(disabled) {
  const table = document.getElementById('presensiTable');
  if (!table) return;

  const selects = table.querySelectorAll('select');
  const inputs = table.querySelectorAll('input[type="text"]');

  selects.forEach(select => select.disabled = disabled);
  inputs.forEach(input => input.disabled = disabled);
}



function renderNewData() {
  return new Promise((resolve, reject) => {
    const kelas = document.getElementById('kelas').value;

    // Pastikan data sudah ada
    if (!dropdownData || !dropdownData.santriData) {
      reject('Data santri tidak tersedia atau salah.');
      return;
    }

    // Memfilter data santri berdasarkan kelas yang dipilih
    const santriData = dropdownData.santriData.filter(santri => santri[2] === kelas);
    if (santriData.length === 0) {
      reject('Tidak ada data santri ditemukan.');
      return;
    }

    // Membuat baris tabel untuk setiap santri
    const rows = santriData.map(santri => `
      <tr>
        <td>${santri[0]}</td>
        <td>${santri[1]}</td>
        <td>
          <select>
            ${['Hadir', 'Sakit', 'Izin', 'Alpa', 'Skorsing', 'Pulang'].map(option => 
              `<option value="${option}">${option}</option>`
            ).join('')}
          </select>
        </td>
        <td><input type="text"></td>
      </tr>
    `).join('');
    
    resolve(rows);
  });
}


// Panggil fungsi untuk memuat data dropdown saat halaman dimuat
document.addEventListener('DOMContentLoaded', loadDropdownData);


async function displayPresensiData() {
  const guruId    = document.getElementById('guruId').value;
  const pelajaran = document.getElementById('mataPelajaran').value;
  const kelas     = document.getElementById('kelas').value;
  const tanggal   = document.getElementById('date').value;
  const waktu     = document.getElementById('waktu').value;
  if (!(guruId && pelajaran && kelas && tanggal)) {
    showPopupMessage('Lengkapi semua field', 'warning');
    return;
  }
  showLoading('Memuat data Presensi…');
  try {
    presensiData = await callGAS('getPresensiData', { waktu, guruId, mataPelajaran: pelajaran, kelas, tanggalString: tanggal });
    console.log('Data presensi:', presensiData);
    renderPresensiTable();
  } catch (err) {
    console.error(err);
    showPopupMessage('Gagal memuat presensi: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}


  function renderPresensiTable() {
  const table = document.getElementById('presensiTable');
  const messageDiv = document.getElementById('message');
  const isDisabled = window.guruTidakHadir === true;

  if (table) {
    if (presensiData.length) {
      table.innerHTML = `
        <thead>
          <tr>${['NIS', 'Nama Santri', 'Status Presensi', 'Catatan'].map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${renderExistingData(presensiData, isDisabled)}
        </tbody>
      `;
      messageDiv.innerHTML = '<span style="color: green;">Sudah dicatat</span>';
      document.getElementById('saveButton').style.display = isDisabled ? 'none' : 'none';
      document.getElementById('updateButton').style.display = isDisabled ? 'none' : 'block';
      document.getElementById('deleteButton').style.display = isDisabled ? 'none' : 'block';

    } else {
      renderNewData().then(newDataHtml => {
        table.innerHTML = `
          <thead>
            <tr>${['NIS', 'Nama Santri', 'Status Presensi', 'Catatan'].map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${newDataHtml}
          </tbody>
        `;
        messageDiv.innerHTML = '<span style="color: red;">Belum dicatat</span>';
        document.getElementById('saveButton').style.display = isDisabled ? 'none' : 'block';
        document.getElementById('updateButton').style.display = 'none';
        document.getElementById('deleteButton').style.display = 'none';

        if (isDisabled) setTableDisabled(true);
      }).catch(error => {
        console.error('Error rendering new data:', error);
        showPopupMessage('Gagal memuat data santri baru: ' + error.message, 'error');
      });
    }
  }
  hideLoading();
}


function renderExistingData(results, isDisabled = false) {
  return results.map(row => `
    <tr>
      <td>${row[0]}</td>
      <td>${row[1]}</td>
      <td>
        <select ${isDisabled ? 'disabled' : ''}>
          ${['Hadir', 'Sakit', 'Izin', 'Alpa', 'Skorsing', 'Pulang'].map(option => 
            `<option value="${option}" ${option === row[2] ? 'selected' : ''}>${option}</option>`
          ).join('')}
        </select>
      </td>
      <td><input type="text" value="${row[3] || ''}" ${isDisabled ? 'disabled' : ''}></td>
    </tr>
  `).join('');
}


  function clearPresensiTable() {
    const table = document.getElementById('presensiTable');
    const messageDiv = document.getElementById('message');
    if (table) {
      table.innerHTML = '';
      messageDiv.innerHTML = '';
      document.getElementById('saveButton').style.display = 'none';
      document.getElementById('updateButton').style.display = 'none';
      document.getElementById('deleteButton').style.display = 'none';
    }
  }

  async function submitForm() {
    showLoading('Menyimpan data.....');
    const form = document.getElementById('attendanceForm');
    if (form) {
      const formData = new FormData(form);
      const guruSelect = document.getElementById('guruId');
      const guruId = guruSelect.value;
      const guruName = guruSelect.options[guruSelect.selectedIndex].textContent;
      const formObject = {
        tanggal: formData.get('date'),
        guru: formData.get('guruId'),
        guruName: guruName,
        waktu: formData.get('waktu'),
        pelajaran: formData.get('mataPelajaran'),
        kelas: formData.get('kelas'),
        santri: Array.from(document.querySelectorAll('#presensiTable tbody tr')).map(row => ({
          nis: row.cells[0].textContent,
          name: row.cells[1].textContent,
          status: row.cells[2].querySelector('select').value,
          catatan: row.cells[3].querySelector('input').value
        }))
      };
    }

    try {
    const response = await callGAS('simpanData', formObject);
    showPopupMessage(response, 'success');
    await displayPresensiData();
  } catch (err) {
    showPopupMessage('Error: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}


  async function updateForm() {
    showLoading('Mengupdate data.....');
    const form = document.getElementById('attendanceForm');
    if (form) {
      const formData = new FormData(form);
      const guruSelect = document.getElementById('guruId');
      const guruId = guruSelect.value;
      const guruName = guruSelect.options[guruSelect.selectedIndex].textContent;
      const formObject = {
        tanggal: formData.get('date'),
        guru: formData.get('guruId'),
        guruName: guruName,
        waktu: formData.get('waktu'),
        pelajaran: formData.get('mataPelajaran'),
        kelas: formData.get('kelas'),
        santri: Array.from(document.querySelectorAll('#presensiTable tbody tr')).map(row => ({
          nis: row.cells[0].textContent,
          name: row.cells[1].textContent,
          status: row.cells[2].querySelector('select').value,
          catatan: row.cells[3].querySelector('input').value
        }))
      };

      try {
    const response = await callGAS('updateData', formObject);
    showPopupMessage(response, 'success');
    await displayPresensiData();
  } catch (err) {
    showPopupMessage('Error: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}
  }

  async function deletePresensi() {
    const tanggal = document.getElementById('date').value;
    const guruSelect = document.getElementById('guruId');
    const guruId = guruSelect.value;
    const guruName = guruSelect.options[guruSelect.selectedIndex].textContent;
    const mataPelajaran = document.getElementById('mataPelajaran').value;
    const kelas = document.getElementById('kelas').value;

    if (!tanggal || !guruId || !mataPelajaran || !kelas) {
      showPopupMessage('Mohon lengkapi semua field sebelum menghapus presensi.', 'error');
      return;
    }

    showConfirmPopup('Yakin hapus?', async () => {
    showLoading('Menghapus data…');
    try {
      const response = await callGAS('deletePresensiData', { tanggal, guruId, guruName, mataPelajaran, kelas });
      showPopupMessage(response, 'success');
      await displayPresensiData();
    } catch (err) {
      showPopupMessage('Error: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });
}

  function showPopupMessage(message, type) {
    const popup = document.getElementById('messagePopup');
    const messageText = document.getElementById('messageText');
    
    popup.className = 'message-popup ' + type;
    messageText.textContent = message;
    
    popup.style.display = 'block';
    
    setTimeout(() => {
      popup.style.display = 'none';
    }, 3000);
  }

  function showConfirmPopup(message, onConfirm) {
    const popup = document.getElementById('confirmPopup');
    const confirmText = document.getElementById('confirmText');
    const yesButton = document.getElementById('confirmYes');
    const noButton = document.getElementById('confirmNo');

    confirmText.textContent = message;
    popup.style.display = 'block';

    yesButton.onclick = () => {
      popup.style.display = 'none';
      onConfirm();
    };

    noButton.onclick = () => {
      popup.style.display = 'none';
    };
  }

  function showPopup() {
    document.getElementById('popup').style.display = 'block';
    loadDropdownData();
  }

  function closePopup() {
    document.getElementById('popup').style.display = 'none';
  }

  function setDefaultGuru() {
    defaultGuru = document.getElementById('popupGuruId').value;
    document.getElementById('guruId').value = defaultGuru;
    localStorage.setItem('selectedGuru', defaultGuru);
    updateMataPelajaran();
    closePopup();
  }

  window.onload = function() {
    setTodayDate();
    const savedGuru = localStorage.getItem('selectedGuru');

    if (savedGuru) {
      loadDropdownData();
      document.getElementById('guruId').value = savedGuru;
      updateMataPelajaran(); // Memuat mata pelajaran saat guru dipilih
    } else {
      showPopup();
    }

    document.getElementById('guruId').addEventListener('change', updateScheduleTable);
 

  };