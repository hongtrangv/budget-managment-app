async function initializeCalendar() {
    // --- DOM Elements ---
    const monthYearElement = document.getElementById('current-month-year');
    const daysGrid = document.getElementById('calendar-days');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const todayBtn = document.getElementById('today-btn');

    const selectedDateDisplay = document.getElementById('selected-date-display');
    const taskList = document.getElementById('task-list');
    const addTaskBtn = document.getElementById('add-task-btn');

    // Modal Elements
    const modalOverlay = document.getElementById('task-modal');
    const modalForm = document.getElementById('task-form');
    const cancelTaskBtn = document.getElementById('cancel-task-btn');

    // --- API Configuration ---
    const API_GATEWAY_URL = 'YOUR_API_GATEWAY_URL/tasks'; // IMPORTANT: Replace this

    // --- State ---
    let currentDate = new Date();
    let selectedDate = new Date();
    let holidays = {};
    let currentYearForHolidays = null;

    // --- Solar to Lunar Conversion Library (Embedded) ---
    function solarToLunar(dd, mm, yy, timeZone = 7) {
        function INT(d) { return Math.floor(d); }
      
        function jdFromDate(dd, mm, yy) {
          const a = INT((14 - mm) / 12);
          const y = yy + 4800 - a;
          const m = mm + 12 * a - 3;
          let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
          if (jd < 2299161) {
            jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
          }
          return jd;
        }
      
        function getNewMoonDay(k, timeZone) {
          const T = k / 1236.85;
          const T2 = T * T;
          const T3 = T2 * T;
          const dr = Math.PI / 180;
          let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
          Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
          const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
          const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
          const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
          let C1 =
            (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
            0.0021 * Math.sin(2 * dr * M) -
            0.4068 * Math.sin(Mpr * dr) +
            0.0161 * Math.sin(2 * dr * Mpr) -
            0.0004 * Math.sin(3 * dr * Mpr) +
            0.0104 * Math.sin(2 * dr * F) -
            0.0051 * Math.sin((M + Mpr) * dr) -
            0.0074 * Math.sin((M - Mpr) * dr) +
            0.0004 * Math.sin((2 * F + M) * dr) -
            0.0004 * Math.sin((2 * F - M) * dr) -
            0.0006 * Math.sin((2 * F + Mpr) * dr) +
            0.0010 * Math.sin((2 * F - Mpr) * dr) +
            0.0005 * Math.sin((2 * Mpr + M) * dr);
      
          let deltat = T < -11
            ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
            : -0.000278 + 0.000265 * T + 0.000262 * T2;
      
          const JdNew = Jd1 + C1 - deltat;
          return INT(JdNew + 0.5 + timeZone / 24);
        }
      
        function getSunLongitude(jdn, timeZone) {
          const T = (jdn - 2451545.5 - timeZone / 24) / 36525;
          const T2 = T * T;
          const dr = Math.PI / 180;
          const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
          const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
          let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
          DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
          let L = L0 + DL;
          L = L * dr;
          L = L - Math.PI * 2 * INT(L / (Math.PI * 2));
          return INT(L / Math.PI * 6);
        }
      
        function getLunarMonth11(yy, timeZone) {
          const off = jdFromDate(31, 12, yy) - 2415021;
          const k = INT(off / 29.530588853);
          let nm = getNewMoonDay(k, timeZone);
          if (getSunLongitude(nm, timeZone) >= 9) {
            nm = getNewMoonDay(k - 1, timeZone);
          }
          return nm;
        }
      
        function getLeapMonthOffset(a11, timeZone) {
          const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
          let last = 0, i = 1;
          let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
          do {
            last = arc;
            i++;
            arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
          } while (arc !== last && i < 14);
          return i - 1;
        }
      
        const dayNumber = jdFromDate(dd, mm, yy);
        const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
        let monthStart = getNewMoonDay(k + 1, timeZone);
        if (monthStart > dayNumber) {
          monthStart = getNewMoonDay(k, timeZone);
        }
      
        let a11 = getLunarMonth11(yy, timeZone);
        let b11 = a11;
        let lunarYear;
      
        if (a11 >= monthStart) {
          lunarYear = yy;
          a11 = getLunarMonth11(yy - 1, timeZone);
        } else {
          lunarYear = yy + 1;
          b11 = getLunarMonth11(yy + 1, timeZone);
        }
      
        const lunarDay = dayNumber - monthStart + 1;
        let diff = INT((monthStart - a11) / 29);
        let lunarMonth = diff + 11;
        let lunarLeap = false;
      
        if (b11 - a11 > 365) {
          const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
          if (diff >= leapMonthDiff) {
            lunarMonth = diff + 10;
            if (diff === leapMonthDiff) lunarLeap = true;
          }
        }
      
        if (lunarMonth > 12) lunarMonth -= 12;
        if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
      
        return { lunarDay, lunarMonth, lunarYear, lunarLeap };
    }   

    // --- Helper ---
    function toYYYYMMDD(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    // --- API Functions ---
    async function fetchHolidays(year) {
        if (year === currentYearForHolidays) return;
        try {
            const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/VN`);
            if (!response.ok) throw new Error('Failed to fetch holidays');
            const data = await response.json();
            holidays = {};
            data.forEach(holiday => { holidays[holiday.date] = holiday.localName; });
            currentYearForHolidays = year;
        } catch (error) {
            console.error('Error fetching holidays:', error);
            holidays = {};
        }
    }

    async function fetchTasks(date) {
        taskList.innerHTML = '<li>Đang tải công việc...</li>';
        // Mock data for demonstration - replace with actual API call
        console.log(`Fetching tasks for ${toYYYYMMDD(date)}... (mock)`);
        const mockTasks = Math.random() > 0.5 ? [
            { description: 'Hoàn thành báo cáo dự án', assignee: 'Nguyễn Văn A' },
            { description: 'Họp với đội ngũ marketing', assignee: 'Trần Thị B' }
        ] : [];
        setTimeout(() => renderTasks(mockTasks), 300);
    }

    async function saveTask(taskData) {
        console.log('Saving task (mock):', JSON.stringify(taskData));
        closeModal();
        fetchTasks(selectedDate);
    }

    // --- Rendering Functions ---
    async function renderCalendar() {
        await fetchHolidays(currentDate.getFullYear());
        daysGrid.innerHTML = '';
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();

        monthYearElement.textContent = `Tháng ${month + 1}, ${year}`;

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfPrevMonth = new Date(year, month, 0);
        const lastDateOfPrevMonth = lastDayOfPrevMonth.getDate();
        let startDayOfWeek = firstDayOfMonth.getDay() === 0 ? 7 : firstDayOfMonth.getDay();

        for (let i = startDayOfWeek - 2; i >= 0; i--) {
            createDayElement(lastDateOfPrevMonth - i, month - 1, year, ['other-month']);
        }

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            createDayElement(i, month, year);
        }

        const totalDaysRendered = (startDayOfWeek - 1) + daysInMonth;
        const remainingDays = Math.ceil(totalDaysRendered / 7) * 7 - totalDaysRendered;
        for (let i = 1; i <= remainingDays; i++) {
            createDayElement(i, month + 1, year, ['other-month']);
        }
        
        updateSelectedDayStyle();
    }

    function createDayElement(day, month, year, classes = []) {
        const dayElement = document.createElement('div');
        const date = new Date(year, month, day);
        const dateString = toYYYYMMDD(date);

        //const lunar = getLunarDate(day, month + 1, year);
        const lunar = solarToLunar(day, month + 1, year);
        const lunarText = lunar.lunarDay === 1 ? `${lunar.lunarDay}/${lunar.lunarMonth}` : lunar.lunarDay;

        dayElement.innerHTML = `<span class="solar-date">${day}</span><span class="lunar-date">${lunarText}</span>`;
        dayElement.dataset.date = dateString;
        dayElement.classList.add(...classes);

        if (holidays[dateString]) {
            dayElement.classList.add('holiday');
            const tooltip = document.createElement('span');
            tooltip.className = 'tooltip';
            tooltip.textContent = holidays[dateString];
            dayElement.appendChild(tooltip);
        }

        daysGrid.appendChild(dayElement);
    }

    function renderTasks(tasks) {
        taskList.innerHTML = '';
        if (!tasks || tasks.length === 0) {
            taskList.innerHTML = '<li>Không có công việc nào cho ngày này.</li>';
            return;
        }
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="task-info">${task.description}</span><span class="task-assignee">${task.assignee}</span>`;
            taskList.appendChild(li);
        });
    }

    // --- UI & Modal Logic ---
    function selectDate(date) {
        selectedDate = date;
        selectedDateDisplay.textContent = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(date);
        updateSelectedDayStyle();
        fetchTasks(date);
    }

    function updateSelectedDayStyle() {
        const selectedDateString = toYYYYMMDD(selectedDate);
        document.querySelectorAll('.days-grid div').forEach(d => {
            d.classList.remove('selected');
            if (d.dataset.date === selectedDateString) d.classList.add('selected');
        });
    }

    function openModal() {
        modalForm.reset();
        modalOverlay.style.display = 'flex';
    }

    function closeModal() {
        modalOverlay.style.display = 'none';
    }

    // --- Event Listeners ---
    prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    todayBtn.addEventListener('click', () => { currentDate = new Date(); selectDate(new Date()); renderCalendar(); });
    daysGrid.addEventListener('click', (e) => {
        const dayElement = e.target.closest('div[data-date]');
        if (dayElement) {
            const [year, month, day] = dayElement.dataset.date.split('-').map(Number);
            selectDate(new Date(year, month - 1, day));
        }
    });
    addTaskBtn.addEventListener('click', openModal);
    cancelTaskBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
    modalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTask({
            date: toYYYYMMDD(selectedDate),
            description: document.getElementById('task-description').value.trim(),
            assignee: document.getElementById('task-assignee').value.trim()
        });
    });

    // --- Initial Load ---
    selectDate(selectedDate);
    renderCalendar();
}

// --- SPA Initialization ---
document.addEventListener('DOMContentLoaded', initializeCalendar);
const observer = new MutationObserver((mutationsList) => {
    for(const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            const calendarContainer = document.querySelector('.calendar-container');
            if (calendarContainer && !calendarContainer.hasAttribute('data-initialized')) {
                initializeCalendar();
                calendarContainer.setAttribute('data-initialized', 'true');
            }
        }
    }
});
observer.observe(document.body, { childList: true, subtree: true });
