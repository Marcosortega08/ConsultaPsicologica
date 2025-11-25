document.addEventListener('DOMContentLoaded', () => {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthElement = document.getElementById('currentMonth');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const slotsWrapper = document.getElementById('slotsWrapper');
    const slotsGrid = document.getElementById('slotsGrid');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    const bookingFormWrapper = document.getElementById('bookingFormWrapper');
    const bookingForm = document.getElementById('bookingForm');
    const backToSlotsBtn = document.getElementById('backToSlots');
    const confirmationModal = document.getElementById('confirmationModal');
    const closeModalElements = document.querySelectorAll('.close-modal, .close-modal-btn');
    const modalDate = document.getElementById('modalDate');
    const modalTime = document.getElementById('modalTime');

    let currentDate = new Date();
    let selectedDate = null;
    let selectedTime = null;

    // State for booked slots (simulated persistence)
    // Load from LocalStorage if available
    let bookedAppointments = JSON.parse(localStorage.getItem('bookedAppointments')) || {};
    let allAppointments = JSON.parse(localStorage.getItem('allAppointments')) || [];

    // Available hours - weekdays: 10:00-20:30, Saturdays: 10:00-13:00
    const availableHours = [
        '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
        '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
    ];

    function renderCalendar(date) {
        calendarGrid.innerHTML = '';
        const year = date.getFullYear();
        const month = date.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay(); // 0 = Sunday

        const monthNames = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        currentMonthElement.textContent = `${monthNames[month]} ${year}`;

        // Day headers
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        dayNames.forEach(day => {
            const header = document.createElement('div');
            header.classList.add('calendar-day-header');
            header.textContent = day;
            calendarGrid.appendChild(header);
        });

        // Empty slots for days before the 1st
        for (let i = 0; i < startingDay; i++) {
            calendarGrid.appendChild(document.createElement('div'));
        }

        // Days
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 1; i <= daysInMonth; i++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day');
            dayElement.textContent = i;

            const currentDayDate = new Date(year, month, i);

            if (currentDayDate.getTime() === today.getTime()) {
                dayElement.classList.add('today');
            }

            // Disable past dates and Sundays only (Saturdays are now available 10:00-13:00)
            if (currentDayDate < today || currentDayDate.getDay() === 0) {
                dayElement.classList.add('disabled');
            } else {
                dayElement.addEventListener('click', () => selectDate(currentDayDate, dayElement));
            }

            if (selectedDate && currentDayDate.getTime() === selectedDate.getTime()) {
                dayElement.classList.add('selected');
            }

            calendarGrid.appendChild(dayElement);
        }
    }

    function selectDate(date, element) {
        // Remove previous selection
        const prevSelected = document.querySelector('.calendar-day.selected');
        if (prevSelected) prevSelected.classList.remove('selected');

        element.classList.add('selected');
        selectedDate = date;

        // Format date for display
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        selectedDateDisplay.textContent = `para el ${date.toLocaleDateString('es-ES', options)}`;
        document.getElementById('selectedDate').value = date.toISOString();

        // Show slots, hide form
        slotsWrapper.style.display = 'block';
        bookingFormWrapper.style.display = 'none';

        // On mobile/tablet, maybe scroll to slots
        if (window.innerWidth < 768) {
            slotsWrapper.scrollIntoView({ behavior: 'smooth' });
        }

        renderSlots();
    }

    function renderSlots() {
        slotsGrid.innerHTML = '';
        const dateKey = selectedDate.toDateString();
        const bookedTimes = bookedAppointments[dateKey] || [];

        // Check if selected date is today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = selectedDate.getTime() === today.getTime();

        // Check if selected date is Saturday (day 6)
        const isSaturday = selectedDate.getDay() === 6;

        // Get current time if it's today
        let currentHour = null;
        let currentMinute = null;
        if (isToday) {
            const now = new Date();
            currentHour = now.getHours();
            currentMinute = now.getMinutes();
        }

        availableHours.forEach(time => {
            // If the time is booked, do not create the slot element
            if (bookedTimes.includes(time)) {
                return;
            }

            const [slotHour, slotMinute] = time.split(':').map(Number);

            // If it's Saturday, only show slots from 10:00 to 13:00
            if (isSaturday) {
                // Only show slots between 10:00 and 12:30 (last slot before 13:00)
                if (slotHour < 10 || slotHour >= 13) {
                    return;
                }
            }

            // If it's today, check if the time has already passed
            if (isToday) {
                // Skip this slot if it's in the past
                if (slotHour < currentHour || (slotHour === currentHour && slotMinute <= currentMinute)) {
                    return;
                }
            }

            const slot = document.createElement('div');
            slot.classList.add('time-slot');
            slot.textContent = time;
            slot.addEventListener('click', () => selectTime(time, slot));
            slotsGrid.appendChild(slot);
        });

        // If no slots available
        if (slotsGrid.children.length === 0) {
            const noSlots = document.createElement('p');
            noSlots.textContent = "No hay horarios disponibles para este día.";
            noSlots.style.gridColumn = "1 / -1";
            noSlots.style.textAlign = "center";
            noSlots.style.color = "var(--text-light)";
            slotsGrid.appendChild(noSlots);
        }
    }

    function selectTime(time, element) {
        const prevSelected = document.querySelector('.time-slot.selected');
        if (prevSelected) prevSelected.classList.remove('selected');

        element.classList.add('selected');
        selectedTime = time;
        document.getElementById('selectedTime').value = time;

        // Show form
        bookingFormWrapper.style.display = 'block';

        // Hide calendar on mobile to focus on form? Or just scroll
        bookingFormWrapper.scrollIntoView({ behavior: 'smooth' });
    }

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    });

    backToSlotsBtn.addEventListener('click', () => {
        bookingFormWrapper.style.display = 'none';
        slotsWrapper.scrollIntoView({ behavior: 'smooth' });
    });

    const NOTIFICATION_EMAIL = "MARCOSSMMARTIN@GMAIL.COM";

    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Simulate API call
        const formData = new FormData(bookingForm);
        const data = Object.fromEntries(formData);

        console.log('Booking Data:', data);

        // Save booking and block necessary slots
        const dateKey = selectedDate.toDateString();
        if (!bookedAppointments[dateKey]) {
            bookedAppointments[dateKey] = [];
        }

        // Block selected time
        bookedAppointments[dateKey].push(selectedTime);

        const timeIndex = availableHours.indexOf(selectedTime);

        // Block PREVIOUS 30 min slot (to prevent overlap)
        if (timeIndex > 0) {
            const prevSlot = availableHours[timeIndex - 1];
            bookedAppointments[dateKey].push(prevSlot);
        }

        // Block NEXT 30 min slot (because session is 1 hour)
        if (timeIndex !== -1 && timeIndex + 1 < availableHours.length) {
            const nextSlot = availableHours[timeIndex + 1];
            bookedAppointments[dateKey].push(nextSlot);
        }

        // Save to LocalStorage
        localStorage.setItem('bookedAppointments', JSON.stringify(bookedAppointments));

        // Save full appointment details
        const appointmentDetails = {
            id: Date.now(),
            date: selectedDate.toISOString(),
            dateString: selectedDate.toLocaleDateString('es-ES'),
            time: selectedTime,
            name: data.name,
            email: data.email,
            phone: data.phone,
            reason: data.reason,
            createdAt: new Date().toISOString()
        };

        allAppointments.push(appointmentDetails);
        localStorage.setItem('allAppointments', JSON.stringify(allAppointments));

        // --- ENVIAR NOTIFICACIÓN POR CORREO (MÉTODO FORMULARIO) ---
        if (NOTIFICATION_EMAIL && NOTIFICATION_EMAIL.includes('@')) {
            // Crear un formulario invisible temporalmente
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = `https://formsubmit.co/${NOTIFICATION_EMAIL}`;

            // Datos a enviar
            const fields = {
                _subject: `Nueva Reserva: ${data.name}`,
                _template: "table",
                _captcha: "false",
                _next: window.location.href, // Redirigir de vuelta a esta página
                nombre_paciente: data.name,
                email_paciente: data.email,
                telefono_paciente: data.phone,
                fecha_reserva: selectedDate.toLocaleDateString('es-ES'),
                hora_reserva: selectedTime,
                motivo_consulta: data.reason
            };

            // Agregar campos al formulario
            for (const key in fields) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = fields[key];
                form.appendChild(input);
            }

            document.body.appendChild(form);
            form.submit();
            // No removemos el form porque se va a redirigir

            console.log("Formulario de correo enviado, redirigiendo...");
        } else {
            // Show success modal if no email configured
            const dateOptions = { day: 'numeric', month: 'long' };
            modalDate.textContent = selectedDate.toLocaleDateString('es-ES', dateOptions);
            modalTime.textContent = selectedTime;

            confirmationModal.style.display = 'flex';
        }
    });

    closeModalElements.forEach(el => {
        el.addEventListener('click', () => {
            confirmationModal.style.display = 'none';
            // Reset form
            bookingForm.reset();
            slotsWrapper.style.display = 'none';
            bookingFormWrapper.style.display = 'none';

            // Clear selection
            const selectedDay = document.querySelector('.calendar-day.selected');
            if (selectedDay) selectedDay.classList.remove('selected');
            selectedDate = null;
            selectedTime = null;

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Initial render
    renderCalendar(currentDate);

    // --- ADMIN LOGIC ---
    const adminLink = document.getElementById('adminLink');
    const adminLoginModal = document.getElementById('adminLoginModal');
    const adminDashboardModal = document.getElementById('adminDashboardModal');
    const closeAdminLogin = document.getElementById('closeAdminLogin');
    const closeAdminDashboard = document.getElementById('closeAdminDashboard');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminPasswordInput = document.getElementById('adminPassword');
    const adminLoginError = document.getElementById('adminLoginError');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    const appointmentsBody = document.getElementById('appointmentsBody');
    const noDataMessage = document.getElementById('noDataMessage');

    const ADMIN_PASSWORD = "admin123";

    adminLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Check if already logged in
        if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
            showAdminDashboard();
        } else {
            adminLoginModal.style.display = 'flex';
        }
    });

    closeAdminLogin.addEventListener('click', () => {
        adminLoginModal.style.display = 'none';
        adminPasswordInput.value = '';
        adminLoginError.style.display = 'none';
    });

    closeAdminDashboard.addEventListener('click', () => {
        adminDashboardModal.style.display = 'none';
    });

    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (adminPasswordInput.value === ADMIN_PASSWORD) {
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            adminLoginModal.style.display = 'none';
            adminPasswordInput.value = '';
            adminLoginError.style.display = 'none';
            showAdminDashboard();
        } else {
            adminLoginError.style.display = 'block';
        }
    });

    adminLogoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('isAdminLoggedIn');
        adminDashboardModal.style.display = 'none';
    });

    function showAdminDashboard() {
        loadAppointments();
        adminDashboardModal.style.display = 'flex';
    }

    function loadAppointments() {
        // Reload from storage to get latest
        const latestAppointments = JSON.parse(localStorage.getItem('allAppointments')) || [];
        console.log('Loading appointments:', latestAppointments);

        if (latestAppointments.length === 0) {
            appointmentsBody.innerHTML = '';
            noDataMessage.style.display = 'block';
            return;
        }

        noDataMessage.style.display = 'none';

        // Sort by date (newest first)
        latestAppointments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        appointmentsBody.innerHTML = latestAppointments.map(app => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 1rem;">${app.dateString}</td>
                <td style="padding: 1rem;">${app.time}</td>
                <td style="padding: 1rem;"><strong>${app.name}</strong></td>
                <td style="padding: 1rem;">
                    <div>${app.email}</div>
                    <div style="font-size: 0.9em; color: var(--text-light);">${app.phone}</div>
                </td>
                <td style="padding: 1rem;">${app.reason || '-'}</td>
                <td style="padding: 1rem;">
                    <button class="btn-secondary cancel-btn" data-id="${app.id}" style="padding: 0.3rem 0.8rem; font-size: 0.8rem; background-color: #ffebee; color: #c62828; border: none; cursor: pointer;">Cancelar</button>
                </td>
            </tr>
                `).join('');

        // Add event listeners to cancel buttons
        const cancelButtons = document.querySelectorAll('.cancel-btn');
        console.log('Found cancel buttons:', cancelButtons.length);

        cancelButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Cancel button clicked!', e.target);
                const id = parseInt(e.target.dataset.id);
                console.log('Attempting to cancel appointment with ID:', id);
                cancelAppointment(id);
            });
        });
    }

    function cancelAppointment(id) {
        console.log('cancelAppointment called with ID:', id);
        console.log('Proceeding with cancellation...');

        let latestAppointments = JSON.parse(localStorage.getItem('allAppointments')) || [];
        const appointmentIndex = latestAppointments.findIndex(app => app.id === id);

        if (appointmentIndex === -1) {
            console.log('Appointment not found with ID:', id);
            return;
        }

        const appointment = latestAppointments[appointmentIndex];
        console.log('Found appointment to cancel:', appointment);

        // 1. Remove from allAppointments
        latestAppointments.splice(appointmentIndex, 1);
        localStorage.setItem('allAppointments', JSON.stringify(latestAppointments));
        console.log('Removed from allAppointments, remaining:', latestAppointments.length);

        // 2. Free up the slot in bookedAppointments
        let currentBooked = JSON.parse(localStorage.getItem('bookedAppointments')) || {};
        const dateKey = new Date(appointment.date).toDateString();
        console.log('Freeing slots for date:', dateKey);

        if (currentBooked[dateKey]) {
            // Remove the main slot
            currentBooked[dateKey] = currentBooked[dateKey].filter(time => time !== appointment.time);

            const timeIndex = availableHours.indexOf(appointment.time);

            // Remove the PREVIOUS slot (that was blocked to prevent overlap)
            if (timeIndex > 0) {
                const prevSlot = availableHours[timeIndex - 1];
                currentBooked[dateKey] = currentBooked[dateKey].filter(time => time !== prevSlot);
                console.log('Freed previous slot:', prevSlot);
            }

            // Remove the NEXT slot (1 hour session logic)
            if (timeIndex !== -1 && timeIndex + 1 < availableHours.length) {
                const nextSlot = availableHours[timeIndex + 1];
                currentBooked[dateKey] = currentBooked[dateKey].filter(time => time !== nextSlot);
                console.log('Freed next slot:', nextSlot);
            }

            // Clean up empty dates
            if (currentBooked[dateKey].length === 0) {
                delete currentBooked[dateKey];
                console.log('Removed empty date entry');
            }

            localStorage.setItem('bookedAppointments', JSON.stringify(currentBooked));
            console.log('Updated bookedAppointments');

            // Update global variable to reflect changes immediately if we are on the same page
            bookedAppointments = currentBooked;
        }

        // 3. Re-render
        console.log('Re-rendering appointments...');
        loadAppointments();

        // If the calendar is currently showing this date, we should re-render slots too
        if (selectedDate && selectedDate.toDateString() === dateKey) {
            console.log('Re-rendering slots for current date');
            renderSlots();
        }

        console.log('Cancellation complete!');
    }
});
