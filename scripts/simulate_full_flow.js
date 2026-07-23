const cookie = require('cookie');

const BASE_URL = 'http://localhost:8081';

async function runSimulation() {
  console.log('===================================================');
  console.log('🚀 E2E REAL FLOW SIMULATION (START TO ARCHIVE)');
  console.log('===================================================\n');

  let adminCookie = '';
  let inquiryId = null;
  let bookingId = null;
  let createdBooking = null;
  let trackingToken = null;
  let fgAccessCode = null;
  let targetPackageId = null;
  let fgId = null;
  let assignmentId = null;

  const bugsFound = [];

  // ==========================================
  // STEP 1: CLIENT INQUIRY (Form Reservasi)
  // ==========================================
  console.log('📌 STEP 1: Client mengajukan reservasi (/inquiry.html)...');
  try {
    // Fetch active packages list
    const pkgRes = await fetch(`${BASE_URL}/api/public/packages`);
    const pkgData = await pkgRes.json();
    const activePackages = pkgData.data || pkgData || [];
    targetPackageId = activePackages.length > 0 ? activePackages[0].id : null;

    const inquiryPayload = {
      client_name: 'Simulasi Real Flow Client',
      client_phone: '6281299887766',
      client_email: 'realflow@test.com',
      university: 'Universitas Indonesia',
      graduation_date: '2026-08-20',
      shooting_time: '09:00',
      duration_hours: 2,
      package_id: targetPackageId,
      location: 'Kampus Depok UI',
      notes: 'Mohon siapkan FG profesional untuk sesi outdoor'
    };

    const res = await fetch(`${BASE_URL}/api/public/inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiryPayload)
    });
    const data = await res.json();

    const responseInquiryId = data.inquiry_id || (data.data ? data.data.id : null);
    if (res.ok && responseInquiryId) {
      inquiryId = responseInquiryId;
      console.log(`   ✅ Inquiry berhasil dibuat! ID: #${inquiryId}`);
    } else {
      const err = `Gagal membuat inquiry: ${JSON.stringify(data)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 1: Client Inquiry', error: err });
      return;
    }
  } catch (e) {
    console.error(`   ❌ Error Step 1: ${e.message}`);
    bugsFound.push({ step: 'Step 1: Client Inquiry', error: e.message });
    return;
  }

  // ==========================================
  // STEP 2: ADMIN LOGIN & VERIFY DP / CONVERT
  // ==========================================
  console.log('\n📌 STEP 2: Admin Login & Konfirmasi DP Client...');
  try {
    const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const setCookieHeader = loginRes.headers.get('set-cookie');
    if (setCookieHeader) {
      adminCookie = setCookieHeader.split(';')[0];
    }

    if (!loginRes.ok) {
      const err = `Admin login gagal: ${JSON.stringify(loginData)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 2: Admin Login', error: err });
      return;
    }
    console.log('   ✅ Admin Login Berhasil!');

    // 2a. Quote inquiry to create booking
    const quoteRes = await fetch(`${BASE_URL}/api/admin/inquiries/${inquiryId}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({ package_id: targetPackageId })
    });
    const quoteData = await quoteRes.json();

    if (!quoteRes.ok) {
      const err = `Gagal quote inquiry ke booking: ${JSON.stringify(quoteData)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 2: Quote Booking', error: err });
      return;
    }

    // Get created booking ID from inquiries route / bookings DB
    const bookingListRes = await fetch(`${BASE_URL}/api/admin/bookings?inquiry_id=${inquiryId}`, {
      headers: { 'Cookie': adminCookie }
    });
    const bookingListData = await bookingListRes.json();
    const bookings = bookingListData.data || [];
    createdBooking = bookings.find(b => b.inquiry_id === inquiryId) || bookings[0];

    if (!createdBooking) {
      const err = `Booking tidak ditemukan setelah quote inquiry #${inquiryId}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 2: Booking Lookup', error: err });
      return;
    }

    bookingId = createdBooking.id;
    console.log(`   ✅ Booking #${bookingId} berhasil dibuat dari Inquiry #${inquiryId}!`);

    // 2b. Verify DP payment
    const verifyDpRes = await fetch(`${BASE_URL}/api/admin/bookings/${bookingId}/verify-dp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({
        dp_amount: createdBooking.dp_amount,
        dp_bukti_url: 'https://example.com/simulasi_bukti_dp.jpg'
      })
    });
    const verifyDpData = await verifyDpRes.json();

    if (verifyDpRes.ok && verifyDpData.booking) {
      trackingToken = verifyDpData.booking.tracking_token || `TRK-${bookingId}`;
      console.log(`   ✅ DP 50% berhasil terverifikasi! Booking status: Confirmed. Token: ${trackingToken}`);
    } else {
      const err = `Gagal verifikasi DP: ${JSON.stringify(verifyDpData)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 2: Verify DP', error: err });
      return;
    }
  } catch (e) {
    console.error(`   ❌ Error Step 2: ${e.message}`);
    bugsFound.push({ step: 'Step 2: Admin Convert', error: e.message });
    return;
  }

  // ==========================================
  // STEP 3: ADMIN ASSIGN FREELANCER (FG)
  // ==========================================
  console.log('\n📌 STEP 3: Admin Assign Fotografer (FG)...');
  try {
    // Get active freelancers list
    const fgListRes = await fetch(`${BASE_URL}/api/admin/freelancers?active=true`, {
      headers: { 'Cookie': adminCookie }
    });
    const fgListData = await fgListRes.json();
    const activeFGs = fgListData.data || [];

    if (activeFGs.length === 0) {
      const err = 'Tidak ada fotografer aktif di database';
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 3: Assign FG', error: err });
      return;
    }

    const selectedFg = activeFGs[0];
    fgId = selectedFg.id;
    fgAccessCode = selectedFg.access_code;
    console.log(`   ℹ️ Memilih FG: ${selectedFg.name} (ID: ${fgId}, Code: ${fgAccessCode})`);

    const assignRes = await fetch(`${BASE_URL}/api/admin/bookings/${bookingId}/assign-fg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({
        fg_id: fgId,
        shooting_time: '09:00',
        duration_hours: 2,
        location: 'Kampus Depok UI',
        brief: 'Foto wisuda outdoor 2 jam, fokus pose portrait & keluarga',
        fg_fee: 100000
      })
    });
    const assignData = await assignRes.json();

    if (assignRes.ok && assignData.assignment) {
      assignmentId = assignData.assignment.id;
      console.log(`   ✅ FG Berhasil Ditugaskan! Assignment ID: #${assignmentId}`);
    } else {
      const err = `Gagal assign FG: ${JSON.stringify(assignData)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 3: Assign FG', error: err });
      return;
    }
  } catch (e) {
    console.error(`   ❌ Error Step 3: ${e.message}`);
    bugsFound.push({ step: 'Step 3: Assign FG', error: e.message });
    return;
  }

  // ==========================================
  // STEP 4: FREELANCE PORTAL WORKFLOW
  // ==========================================
  console.log('\n📌 STEP 4: Freelance Portal Workflow (Confirm ➔ Checkin ➔ Setor Link)...');
  try {
    // 4a. Get FG Assignments via Schedule
    const fgPortalRes = await fetch(`${BASE_URL}/api/public/freelance-portal/schedule?fg_id=${fgId}&access_code=${fgAccessCode}`);
    const fgPortalData = await fgPortalRes.json();

    if (!fgPortalRes.ok || !fgPortalData.assignments) {
      const err = `Gagal muat portal FG: ${JSON.stringify(fgPortalData)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 4: Portal FG Load', error: err });
      return;
    }
    console.log(`   ✅ Portal FG terverifikasi! (${fgPortalData.assignments.length} tugas)`);

    // 4b. Confirm Job (Accept Assignment)
    const confirmRes = await fetch(`${BASE_URL}/api/public/freelance-portal/accept-assignment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fg_id: fgId, access_code: fgAccessCode, assignment_id: assignmentId })
    });
    const confirmData = await confirmRes.json();
    if (!confirmRes.ok) {
      const err = `Gagal konfirmasi job: ${JSON.stringify(confirmData)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 4: FG Confirm', error: err });
    } else {
      console.log('   ✅ FG mengonfirmasi penerimaan tugas!');
    }

    // 4c. Confirm Photo Shoot Finished
    const checkinRes = await fetch(`${BASE_URL}/api/public/freelance-portal/confirm-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fg_id: fgId, access_code: fgAccessCode, assignment_id: assignmentId })
    });
    const checkinData = await checkinRes.json();
    if (!checkinRes.ok) {
      const err = `Gagal konfirmasi sesi foto: ${JSON.stringify(checkinData)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 4: FG Session Done', error: err });
    } else {
      console.log('   ✅ FG Konfirmasi "Sesi Foto Selesai"!');
    }

    // 4d. Upload Google Drive Link Hasil Shoot
    const uploadRes = await fetch(`${BASE_URL}/api/public/freelance-portal/submit-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fg_id: fgId,
        access_code: fgAccessCode,
        assignment_id: assignmentId,
        delivery_type: 'link',
        drive_folder_url: 'https://drive.google.com/drive/folders/simulasi_real_flow_shoot'
      })
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      const err = `Gagal upload link drive FG: ${JSON.stringify(uploadData)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 4: FG Upload Drive', error: err });
    } else {
      console.log('   ✅ FG berhasil menyetor link Google Drive hasil shoot!');
    }
  } catch (e) {
    console.error(`   ❌ Error Step 4: ${e.message}`);
    bugsFound.push({ step: 'Step 4: Portal FG Workflow', error: e.message });
    return;
  }

  // ==========================================
  // STEP 5: CLIENT PHOTO SELECTION & TRACKING
  // ==========================================
  console.log('\n📌 STEP 5: Client Lacak Tracking & Submit Seleksi Foto...');
  try {
    // 5a. Check Tracking Info
    const trackingRes = await fetch(`${BASE_URL}/api/public/tracking?code=${trackingToken}`);
    const trackingData = await trackingRes.json();

    if (!trackingRes.ok || !trackingData) {
      const err = `Gagal baca tracking token: ${JSON.stringify(trackingData)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 5: Client Tracking', error: err });
    } else {
      console.log(`   ✅ Client berhasil membuka tracking! Status: "${trackingData.status_label || trackingData.status}"`);
    }

    // 5b. Submit Selection Photos
    const selectionRes = await fetch(`${BASE_URL}/api/public/selection/${bookingId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selected_photos: [
          'IMG_001.JPG', 'IMG_005.JPG', 'IMG_012.JPG', 'IMG_020.JPG', 'IMG_045.JPG'
        ],
        notes: 'Tolong edit warna agak warm vintage'
      })
    });
    const selectionData = await selectionRes.json();

    if (!selectionRes.ok) {
      const err = `Gagal submit seleksi foto: ${JSON.stringify(selectionData)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 5: Submit Seleksi Foto', error: err });
    } else {
      console.log('   ✅ Client berhasil submit 5 foto pilihan ke tim editor!');
    }
  } catch (e) {
    console.error(`   ❌ Error Step 5: ${e.message}`);
    bugsFound.push({ step: 'Step 5: Client Selection', error: e.message });
    return;
  }

  // ==========================================
  // STEP 6: ADMIN VERIFY BALANCE & SEND DELIVERABLES
  // ==========================================
  console.log('\n📌 STEP 6: Admin Verifikasi Pelunasan & Kirim Link Final...');
  try {
    // 6a. Admin Verify Balance Payment
    const verifyBalRes = await fetch(`${BASE_URL}/api/admin/bookings/${bookingId}/verify-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({
        balance_amount: createdBooking.balance_amount,
        balance_bukti_url: 'https://example.com/simulasi_bukti_pelunasan.jpg'
      })
    });
    const verifyBalData = await verifyBalRes.json();
    if (!verifyBalRes.ok) {
      const err = `Gagal verifikasi pelunasan: ${JSON.stringify(verifyBalData)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 6: Verify Balance', error: err });
    } else {
      console.log('   ✅ Admin verifikasi Pelunasan (Lunas 100%)!');
    }

    // 6b. Admin Send Final Google Drive Deliverables Link
    const deliverRes = await fetch(`${BASE_URL}/api/admin/post-production/${bookingId}/send-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie },
      body: JSON.stringify({
        download_url: 'https://drive.google.com/drive/folders/simulasi_edited_final_all',
        password: '123456'
      })
    });
    const deliverData = await deliverRes.json();

    if (!deliverRes.ok) {
      const err = `Gagal kirim link deliverables: ${JSON.stringify(deliverData)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 6: Admin Deliverables', error: err });
    } else {
      console.log('   ✅ Admin berhasil mengirim link foto final ke client!');
    }
  } catch (e) {
    console.error(`   ❌ Error Step 6: ${e.message}`);
    bugsFound.push({ step: 'Step 6: Admin Deliverables', error: e.message });
    return;
  }

  // ==========================================
  // STEP 7: CLIENT CONFIRM RECEIPT & MOVE TO ARCHIVE
  // ==========================================
  console.log('\n📌 STEP 7: Client Konfirmasi Penerimaan Hasil Foto...');
  try {
    const confirmReceiptRes = await fetch(`${BASE_URL}/api/public/tracking/${bookingId}/confirm-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trackingToken })
    });
    const confirmReceiptData = await confirmReceiptRes.json();

    if (!confirmReceiptRes.ok) {
      const err = `Gagal konfirmasi penerimaan foto: ${JSON.stringify(confirmReceiptData)}`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 7: Confirm Receipt', error: err });
    } else {
      console.log('   ✅ Client mengonfirmasi "Saya Sudah Menerima Hasil Foto"!');
    }

    // Verify status in Archive menu
    const archiveRes = await fetch(`${BASE_URL}/api/admin/archive?tab=completed`, {
      headers: { 'Cookie': adminCookie }
    });
    const archiveData = await archiveRes.json();
    const archivedItems = archiveData.data || [];
    const foundInArchive = archivedItems.find(item => item.id === bookingId);

    if (foundInArchive) {
      console.log(`   🎉 VERIFIKASI BERHASIL! Data Client #${bookingId} (${foundInArchive.client_name}) SUDAH RESMI MASUK DI MENU ARSIP CLIENT!`);
    } else {
      const err = `Client #${bookingId} tidak ditemukan di menu Arsip Client completed`;
      console.error(`   ❌ ${err}`);
      bugsFound.push({ step: 'Step 7: Archive Verification', error: err });
    }
  } catch (e) {
    console.error(`   ❌ Error Step 7: ${e.message}`);
    bugsFound.push({ step: 'Step 7: Client Confirm Receipt', error: e.message });
    return;
  }

  console.log('\n===================================================');
  console.log('📊 SIMULATION RESULT SUMMARY');
  console.log('===================================================');
  if (bugsFound.length === 0) {
    console.log('🎉 100% SUKSES! Seluruh alur (Client ➔ Admin ➔ FG ➔ Editor ➔ Client ➔ Arsip) berjalan lancar TANPA BUG!');
  } else {
    console.log(`⚠️ DITEMUKAN ${bugsFound.length} MASALAH/BUG SELAMA SIMULASI:`);
    bugsFound.forEach((b, idx) => {
      console.log(`  ${idx + 1}. [${b.step}]: ${b.error}`);
    });
  }
}

runSimulation();
