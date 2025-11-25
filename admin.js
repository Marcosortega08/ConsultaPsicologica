document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('loginScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');
    const appointmentsBody = document.getElementById('appointmentsBody');
    const noDataMessage = document.getElementById('noDataMessage');

    // Simple password check (NOT SECURE for production, but okay for demo)
    const ADMIN_PASSWORD = "admin123";

    // Available hours - weekdays: 10:00-20:30, Saturdays: 10:00-13:00 (same as in script.js)
    const availableHours = [
        '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
        '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
    ];

    // Check if already logged in
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        showDashboard();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = passwordInput.value;

        if (password === ADMIN_PASSWORD) {
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            showDashboard();
            loginError.style.display = 'none';
        } else {
            loginError.style.display = 'block';
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('isAdminLoggedIn');
        // Redirect to home page
        window.location.href = 'index.html';
    });

    function showDashboard() {
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'block';
        loadAppointments();
    }

    function loadAppointments() {
        const allAppointments = JSON.parse(localStorage.getItem('allAppointments')) || [];
        console.log('[Admin] Loading appointments:', allAppointments);

        if (allAppointments.length === 0) {
            appointmentsBody.innerHTML = '';
            noDataMessage.style.display = 'block';
            return;
        }

        noDataMessage.style.display = 'none';

        // Sort by date (newest first)
        allAppointments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        appointmentsBody.innerHTML = allAppointments.map(app => `
            <tr>
                <td>${app.dateString}</td>
                <td>${app.time}</td>
                <td>
                    <strong>${app.name}</strong>
                </td>
                <td>
                    <div>${app.email}</div>
                    <div style="font-size: 0.9em; color: var(--text-light);">${app.phone}</div>
                </td>
                <td>${app.reason || '-'}</td>
                <td>
                    <button class="payment-toggle-btn" data-id="${app.id}" 
                        style="padding: 0.4rem 0.8rem; font-size: 0.85rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s ease; ${app.paid ? 'background-color: #4CAF50; color: white;' : 'background-color: #ffebee; color: #c62828;'}">
                        ${app.paid ? '✓ Pagado' : '✗ No Pagado'}
                    </button>
                </td>
                <td>
                    <button class="btn-secondary cancel-btn" data-id="${app.id}" style="padding: 0.3rem 0.8rem; font-size: 0.8rem; background-color: #ffebee; color: #c62828; border: none; cursor: pointer;">Cancelar</button>
                </td>
            </tr>
        `).join('');

        // Add event listeners to cancel buttons
        const cancelButtons = document.querySelectorAll('.cancel-btn');
        console.log('[Admin] Found cancel buttons:', cancelButtons.length);

        cancelButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('[Admin] Cancel button clicked!', e.target);
                const id = parseInt(e.target.dataset.id);
                console.log('[Admin] Attempting to cancel appointment with ID:', id);
                cancelAppointment(id);
            });
        });

        // Add event listeners to payment toggle buttons
        const paymentButtons = document.querySelectorAll('.payment-toggle-btn');
        console.log('[Admin] Found payment toggle buttons:', paymentButtons.length);

        paymentButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                console.log('[Admin] Payment toggle clicked for ID:', id);
                togglePaymentStatus(id);
            });
        });
    }

    function togglePaymentStatus(id) {
        let allAppointments = JSON.parse(localStorage.getItem('allAppointments')) || [];
        const appointmentIndex = allAppointments.findIndex(app => app.id === id);

        if (appointmentIndex === -1) {
            console.log('[Admin] Appointment not found with ID:', id);
            return;
        }

        // Toggle the payment status
        allAppointments[appointmentIndex].paid = !allAppointments[appointmentIndex].paid;

        // Save to localStorage
        localStorage.setItem('allAppointments', JSON.stringify(allAppointments));
        console.log('[Admin] Payment status toggled for ID:', id, '- Paid:', allAppointments[appointmentIndex].paid);

        // Re-render the table
        loadAppointments();
    }

    function cancelAppointment(id) {
        console.log('[Admin] cancelAppointment called with ID:', id);
        console.log('[Admin] Proceeding with cancellation...');

        let latestAppointments = JSON.parse(localStorage.getItem('allAppointments')) || [];
        const appointmentIndex = latestAppointments.findIndex(app => app.id === id);

        if (appointmentIndex === -1) {
            console.log('[Admin] Appointment not found with ID:', id);
            return;
        }

        const appointment = latestAppointments[appointmentIndex];
        console.log('[Admin] Found appointment to cancel:', appointment);

        // 1. Remove from allAppointments
        latestAppointments.splice(appointmentIndex, 1);
        localStorage.setItem('allAppointments', JSON.stringify(latestAppointments));
        console.log('[Admin] Removed from allAppointments, remaining:', latestAppointments.length);

        // 2. Free up the slot in bookedAppointments
        let currentBooked = JSON.parse(localStorage.getItem('bookedAppointments')) || {};
        const dateKey = new Date(appointment.date).toDateString();
        console.log('[Admin] Freeing slots for date:', dateKey);

        if (currentBooked[dateKey]) {
            // Remove the main slot
            currentBooked[dateKey] = currentBooked[dateKey].filter(time => time !== appointment.time);

            const timeIndex = availableHours.indexOf(appointment.time);

            // Remove the PREVIOUS slot (that was blocked to prevent overlap)
            if (timeIndex > 0) {
                const prevSlot = availableHours[timeIndex - 1];
                currentBooked[dateKey] = currentBooked[dateKey].filter(time => time !== prevSlot);
                console.log('[Admin] Freed previous slot:', prevSlot);
            }

            // Remove the NEXT slot (1 hour session logic)
            if (timeIndex !== -1 && timeIndex + 1 < availableHours.length) {
                const nextSlot = availableHours[timeIndex + 1];
                currentBooked[dateKey] = currentBooked[dateKey].filter(time => time !== nextSlot);
                console.log('[Admin] Freed next slot:', nextSlot);
            }

            // Clean up empty dates
            if (currentBooked[dateKey].length === 0) {
                delete currentBooked[dateKey];
                console.log('[Admin] Removed empty date entry');
            }

            localStorage.setItem('bookedAppointments', JSON.stringify(currentBooked));
            console.log('[Admin] Updated bookedAppointments');
        }

        // 3. Re-render
        console.log('[Admin] Re-rendering appointments...');
        loadAppointments();
        console.log('[Admin] Cancellation complete!');
    }
});
