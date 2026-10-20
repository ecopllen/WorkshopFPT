// src/public/js/app.js
// Client-side application logic for Know Your Strengths Platform

const app = {
  currentUser: null,
  currentView: 'home',
  questions: [],
  categories: {},
  currentQuestionIdx: 0,
  userAnswers: {}, // { questionId: optionId }
  proposedTeamsState: null,
  reassignTargetUserId: null,

  async init() {
    // 1. Check existing session
    await this.fetchCurrentUser();

    // 2. Fetch categories and question metadata
    await this.fetchQuestions();

    // 3. Set up theme
    const savedTheme = localStorage.getItem('kys_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // 4. Initial navigation
    const initialView = window.location.hash.replace('#', '') || 'home';
    this.navigate(initialView);
  },

  // ----------------------------------------------------
  // NAVIGATION & THEME
  // ----------------------------------------------------
  navigate(viewName) {
    // Protect private views
    if (['test', 'directory', 'community', 'profile', 'admin'].includes(viewName)) {
      if (!this.currentUser && viewName !== 'test') {
        this.showToast('Vui lòng đăng nhập để tiếp tục.');
        this.openAuthModal('login');
        return;
      }
    }

    if (viewName === 'admin' && (!this.currentUser || this.currentUser.role !== 'admin')) {
      this.showToast('Bạn không có quyền truy cập trang Quản trị viên.', 'warning');
      this.navigate('home');
      return;
    }

    this.currentView = viewName;
    window.location.hash = viewName;

    // Update active nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.view === viewName);
    });

    // Update views
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const activeSec = document.getElementById(`view-${viewName}`);
    if (activeSec) {
      activeSec.classList.add('active');
    }

    // Load data for specific view
    if (viewName === 'directory') {
      this.filterDirectory();
    } else if (viewName === 'community') {
      this.loadCommunityPosts();
    } else if (viewName === 'profile') {
      this.loadProfile();
    } else if (viewName === 'admin') {
      this.loadAdminOverview();
    }
  },

  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('kys_theme', next);
    document.getElementById('btn-theme-toggle').innerText = next === 'dark' ? '☀️' : '🌙';
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  },

  // ----------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------
  async fetchCurrentUser() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      this.currentUser = data.user;
      this.updateAuthUI();
    } catch (e) {
      this.currentUser = null;
      this.updateAuthUI();
    }
  },

  updateAuthUI() {
    const unauthBox = document.getElementById('auth-unauthenticated');
    const authBox = document.getElementById('auth-authenticated');
    const adminNavItem = document.getElementById('nav-admin-item');

    if (this.currentUser) {
      unauthBox.style.display = 'none';
      authBox.style.display = 'flex';
      document.getElementById('user-display-name').innerText = this.currentUser.fullName || this.currentUser.email.split('@')[0];
      document.getElementById('user-role-badge').innerText = this.currentUser.role === 'admin' ? 'Quản trị viên 👑' : 'Sinh viên';

      if (this.currentUser.role === 'admin') {
        adminNavItem.style.display = 'block';
      } else {
        adminNavItem.style.display = 'none';
      }
    } else {
      unauthBox.style.display = 'block';
      authBox.style.display = 'none';
      adminNavItem.style.display = 'none';
    }
  },

  openAuthModal(tab = 'login') {
    document.getElementById('modal-auth').classList.add('active');
    this.setAuthTab(tab);
  },

  closeAuthModal() {
    document.getElementById('modal-auth').classList.remove('active');
  },

  setAuthTab(tab) {
    const isRegister = tab === 'register';
    document.getElementById('group-auth-name').style.display = isRegister ? 'block' : 'none';
    document.getElementById('auth-modal-title').innerText = isRegister ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập Nền Tảng';
    document.getElementById('btn-auth-submit').innerText = isRegister ? 'Đăng Ký Tài Khoản Mới' : 'Đăng Nhập';

    document.getElementById('btn-tab-login').className = isRegister ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm';
    document.getElementById('btn-tab-register').className = isRegister ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
  },

  async handleAuthSubmit(e) {
    e.preventDefault();
    const isRegister = document.getElementById('group-auth-name').style.display === 'block';
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const fullName = document.getElementById('auth-fullName').value.trim();

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister ? { email, password, fullName } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Xác thực không thành công.');
      }

      this.currentUser = data.user;
      this.updateAuthUI();
      this.closeAuthModal();
      this.showToast(`Chào mừng ${data.user.fullName || data.user.email}!`);

      if (isRegister) {
        this.navigate('profile');
      }
    } catch (err) {
      alert(err.message);
    }
  },

  // Simulated Google OAuth with real domain checking & server validation
  async signInWithGoogle() {
    const email = prompt('Nhập địa chỉ Google / Gmail của bạn (ví dụ: student@gmail.com hoặc student@fpt.edu.vn):');
    if (!email) return;

    const name = prompt('Nhập họ tên đầy đủ:', email.split('@')[0]) || email.split('@')[0];

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName: name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.currentUser = data.user;
      this.updateAuthUI();
      this.closeAuthModal();
      this.showToast(`Đăng nhập Google thành công: ${data.user.email}`);
    } catch (err) {
      alert(err.message);
    }
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    this.currentUser = null;
    this.updateAuthUI();
    this.showToast('Bạn đã đăng xuất.');
    this.navigate('home');
  },

  // ----------------------------------------------------
  // MINI TEST (15 CÂU)
  // ----------------------------------------------------
  async fetchQuestions() {
    try {
      const res = await fetch('/api/assessment/questions');
      const data = await res.json();
      this.questions = data.questions || [];
      this.categories = data.categories || {};
    } catch (err) {
      console.error('Fetch questions failed:', err);
    }
  },

  startTest() {
    if (!this.currentUser) {
      this.showToast('Vui lòng đăng nhập trước khi làm bài Mini Test.');
      this.openAuthModal('login');
      return;
    }
    this.navigate('test');
    document.getElementById('test-intro-card').style.display = 'block';
    document.getElementById('test-active-card').style.display = 'none';
    document.getElementById('test-result-card').style.display = 'none';
  },

  beginQuestionnaire() {
    this.currentQuestionIdx = 0;
    this.userAnswers = {};
    document.getElementById('test-intro-card').style.display = 'none';
    document.getElementById('test-active-card').style.display = 'block';
    document.getElementById('test-result-card').style.display = 'none';
    this.renderCurrentQuestion();
  },

  renderCurrentQuestion() {
    const q = this.questions[this.currentQuestionIdx];
    if (!q) return;

    document.getElementById('question-counter').innerText = `Câu hỏi ${this.currentQuestionIdx + 1} / ${this.questions.length}`;
    const percent = Math.round(((this.currentQuestionIdx + 1) / this.questions.length) * 100);
    document.getElementById('question-progress-percent').innerText = `${percent}%`;
    document.getElementById('progress-fill').style.width = `${percent}%`;

    document.getElementById('q-title').innerText = `Tình huống ${q.id}: ${q.title}`;
    document.getElementById('q-scenario').innerText = q.scenario;

    const optContainer = document.getElementById('q-options-container');
    optContainer.innerHTML = '';

    const selectedOption = this.userAnswers[q.id];

    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = `option-btn ${selectedOption === opt.id ? 'selected' : ''}`;
      btn.onclick = () => this.selectOption(q.id, opt.id);
      btn.innerHTML = `
        <div class="option-key">${opt.id}</div>
        <div style="flex-grow: 1;">${opt.text}</div>
      `;
      optContainer.appendChild(btn);
    });

    document.getElementById('btn-prev-question').style.visibility = this.currentQuestionIdx === 0 ? 'hidden' : 'visible';
    const nextBtn = document.getElementById('btn-next-question');
    if (this.currentQuestionIdx === this.questions.length - 1) {
      nextBtn.innerText = 'Hoàn thành bài test 🎯';
    } else {
      nextBtn.innerText = 'Câu tiếp theo →';
    }
  },

  selectOption(qId, optId) {
    this.userAnswers[qId] = optId;
    this.renderCurrentQuestion();
  },

  prevQuestion() {
    if (this.currentQuestionIdx > 0) {
      this.currentQuestionIdx--;
      this.renderCurrentQuestion();
    }
  },

  async nextQuestion() {
    const curQ = this.questions[this.currentQuestionIdx];
    if (!this.userAnswers[curQ.id]) {
      this.showToast('Vui lòng chọn 1 đáp án trước khi qua câu tiếp theo.');
      return;
    }

    if (this.currentQuestionIdx < this.questions.length - 1) {
      this.currentQuestionIdx++;
      this.renderCurrentQuestion();
    } else {
      // Submit assessment
      await this.submitAssessment();
    }
  },

  async submitAssessment() {
    try {
      const res = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: this.userAnswers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.renderAssessmentResult(data);
    } catch (err) {
      alert(err.message);
    }
  },

  renderAssessmentResult(data) {
    document.getElementById('test-intro-card').style.display = 'none';
    document.getElementById('test-active-card').style.display = 'none';
    document.getElementById('test-result-card').style.display = 'block';

    const pCat = data.primaryCategory || {};
    const sCat = data.secondaryCategory || {};

    // Primary
    const pBadge = document.getElementById('res-primary-badge');
    pBadge.className = `badge-strength badge-${data.primaryStrength}`;
    pBadge.innerText = `PRIMARY: ${data.primaryStrength}`;
    document.getElementById('res-primary-name').innerText = pCat.labelVi || data.primaryStrength;
    document.getElementById('res-primary-role').innerText = `${pCat.role || ''} · ${pCat.roleVi || ''}`;
    document.getElementById('res-primary-desc').innerText = pCat.description || '';

    // Secondary
    const sBadge = document.getElementById('res-secondary-badge');
    sBadge.className = `badge-strength badge-${data.secondaryStrength}`;
    sBadge.innerText = `SECONDARY: ${data.secondaryStrength}`;
    document.getElementById('res-secondary-name').innerText = sCat.labelVi || data.secondaryStrength;
    document.getElementById('res-secondary-role').innerText = `${sCat.role || ''} · ${sCat.roleVi || ''}`;
    document.getElementById('res-secondary-desc').innerText = sCat.description || '';

    // Score bars
    const breakdown = document.getElementById('score-breakdown-container');
    breakdown.innerHTML = '';

    const colors = {
      Communication: 'var(--str-comm)',
      Creativity: 'var(--str-creat)',
      Research: 'var(--str-res)',
      Leadership: 'var(--str-lead)',
      'Problem-solving': 'var(--str-prob)'
    };

    for (const [key, score] of Object.entries(data.scores)) {
      const bar = document.createElement('div');
      const widthPct = Math.round((score / 15) * 100);
      bar.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 4px;">
          <span><b>${key}</b></span>
          <span><b>${score} / 15 điểm</b> (${widthPct}%)</span>
        </div>
        <div style="height: 10px; background: var(--line); border-radius: 999px; overflow: hidden;">
          <div style="height: 100%; width: ${widthPct}%; background: ${colors[key]}; border-radius: 999px;"></div>
        </div>
      `;
      breakdown.appendChild(bar);
    }
  },

  // ----------------------------------------------------
  // TEAMMATE DIRECTORY
  // ----------------------------------------------------
  async filterDirectory() {
    const strength = document.getElementById('dir-filter-strength').value;
    const teamStatus = document.getElementById('dir-filter-status').value;
    const classYear = document.getElementById('dir-filter-class').value;
    const search = document.getElementById('dir-search').value;
    const includeDemo = document.getElementById('check-include-demo').checked;

    const params = new URLSearchParams();
    if (strength) params.append('strength', strength);
    if (teamStatus) params.append('teamStatus', teamStatus);
    if (classYear) params.append('classYear', classYear);
    if (search) params.append('search', search);
    if (includeDemo) params.append('includeDemo', 'true');

    try {
      const res = await fetch(`/api/directory?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          this.openAuthModal('login');
          return;
        }
        throw new Error('Không thể tải danh bạ.');
      }
      const data = await res.json();
      this.renderDirectoryStudents(data.directory || []);
      document.getElementById('dir-total-count').innerText = data.total || 0;
    } catch (err) {
      console.error(err);
    }
  },

  renderDirectoryStudents(students) {
    const grid = document.getElementById('directory-student-grid');
    grid.innerHTML = '';

    if (students.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--surface); border-radius: var(--radius); border: 1px dashed var(--line);">
          <p style="color: var(--mute); font-size: 1.05rem;">Không tìm thấy bạn sinh viên nào khớp với bộ lọc.</p>
          <p style="font-size: 0.85rem; color: var(--mute);">Hãy thử tích chọn "Bao gồm 30 hồ sơ mẫu" hoặc điều chỉnh từ khóa tìm kiếm.</p>
        </div>
      `;
      return;
    }

    students.forEach(s => {
      const card = document.createElement('div');
      card.className = 'student-card';

      let statusClass = 'status-finding';
      if (s.teamStatus === 'Đã có nhóm') statusClass = 'status-has-group';
      if (s.teamStatus && s.teamStatus.includes('cân nhắc')) statusClass = 'status-considering';

      const skillsHtml = (s.skills || []).slice(0, 4).map(sk => `<span class="tag">${sk}</span>`).join('');
      const pStr = s.assessment?.primaryStrength || 'Chưa test';
      const sStr = s.assessment?.secondaryStrength || '';

      card.innerHTML = `
        <div class="student-head">
          <img class="student-avatar" src="${s.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" alt="${s.fullName}">
          <div style="flex-grow: 1;">
            <div class="student-name">${s.fullName} ${s.isDemo ? '<span class="badge-demo">Demo</span>' : ''}</div>
            <div class="student-meta">${s.classYear ? s.classYear + ' · ' : ''}${s.desiredRole || 'Thành viên'}</div>
          </div>
        </div>

        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
          ${s.assessment ? `<span class="badge-strength badge-${pStr}">${pStr}</span>` : '<span style="font-size: 0.75rem; color: var(--mute);">Ẩn điểm mạnh</span>'}
          ${sStr ? `<span style="font-size: 0.75rem; background: var(--surface-alt); padding: 2px 8px; border-radius: 999px;">Phụ: ${sStr}</span>` : ''}
        </div>

        <div style="margin-bottom: 8px;">
          <span class="badge-status ${statusClass}">${s.teamStatus || 'Đang tìm teammate'}</span>
        </div>

        <div class="student-bio">${s.bio || 'Chưa cập nhật phần tự giới thiệu bản thân.'}</div>

        <div class="student-tags">${skillsHtml}</div>

        <div style="margin-top: 14px; display: flex; gap: 8px;">
          <button class="btn btn-outline btn-sm" style="flex: 1;" onclick="app.viewStudentDetail('${s.userId}')">Xem chi tiết 🔍</button>
          <button class="btn btn-primary btn-sm" onclick="app.sendConnectInvite('${s.userId}', '${s.fullName.replace(/'/g, "\\'")}')">Kết nối 🤝</button>
        </div>
      `;
      grid.appendChild(card);
    });
  },

  async viewStudentDetail(userId) {
    try {
      const res = await fetch(`/api/profile/${userId}`);
      if (!res.ok) throw new Error('Không thể tải chi tiết sinh viên.');
      const s = await res.json();

      const modalBody = document.getElementById('student-modal-body');
      const pStr = s.assessment?.primaryStrength;
      const sStr = s.assessment?.secondaryStrength;

      modalBody.innerHTML = `
        <div style="display: flex; gap: 18px; align-items: center; margin-bottom: 20px;">
          <img style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover;" src="${s.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}">
          <div>
            <h2 style="font-size: 1.4rem;">${s.fullName} ${s.isDemo ? '<span class="badge-demo">Demo</span>' : ''}</h2>
            <div style="color: var(--mute); font-size: 0.88rem;">${s.studentId ? 'MSSV: ' + s.studentId + ' · ' : ''}Khóa ${s.classYear || 'Chưa rõ'} · ${s.desiredRole || 'Thành viên'}</div>
          </div>
        </div>

        <div style="background: var(--surface-alt); padding: 14px; border-radius: 8px; margin-bottom: 18px;">
          <b>Trạng thái tìm nhóm:</b> ${s.teamStatus || 'Đang tìm teammate'}
        </div>

        ${s.assessment ? `
          <div style="border: 1px solid var(--line); border-radius: 8px; padding: 16px; margin-bottom: 18px;">
            <h4 style="margin-bottom: 10px;">Điểm Mạnh Nổi Bật (Strength Card)</h4>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
              <span class="badge-strength badge-${pStr}">Chính: ${pStr}</span>
              ${sStr ? `<span class="badge-strength badge-${sStr}">Phụ: ${sStr}</span>` : ''}
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; font-size: 0.82rem; text-align: center;">
              <div style="background: var(--surface); padding: 8px; border-radius: 6px;"><b>Comm:</b> ${s.assessment.scores?.Communication || 0}</div>
              <div style="background: var(--surface); padding: 8px; border-radius: 6px;"><b>Creat:</b> ${s.assessment.scores?.Creativity || 0}</div>
              <div style="background: var(--surface); padding: 8px; border-radius: 6px;"><b>Res:</b> ${s.assessment.scores?.Research || 0}</div>
              <div style="background: var(--surface); padding: 8px; border-radius: 6px;"><b>Lead:</b> ${s.assessment.scores?.Leadership || 0}</div>
              <div style="background: var(--surface); padding: 8px; border-radius: 6px;"><b>Prob:</b> ${s.assessment.scores?.['Problem-solving'] || 0}</div>
            </div>
          </div>
        ` : `
          <div class="alert alert-info">Sinh viên này đã lựa chọn ẩn thông tin bài test.</div>
        `}

        <div style="margin-bottom: 16px;">
          <h4>Giới thiệu bản thân</h4>
          <p style="color: var(--ink-secondary); font-size: 0.92rem; margin-top: 4px;">${s.bio || 'Chưa có thông tin.'}</p>
        </div>

        <div style="margin-bottom: 16px;">
          <h4>Kỹ năng</h4>
          <div class="student-tags" style="margin-top: 6px;">
            ${(s.skills || []).map(sk => `<span class="tag">${sk}</span>`).join('') || '<span style="color: var(--mute);">Chưa cập nhật</span>'}
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <h4>Chủ đề đề tài quan tâm</h4>
          <div class="student-tags" style="margin-top: 6px;">
            ${(s.projectInterests || []).map(pi => `<span class="tag" style="background: var(--fpt-light); color: var(--fpt-dark);">${pi}</span>`).join('') || '<span style="color: var(--mute);">Chưa cập nhật</span>'}
          </div>
        </div>

        <div style="border-top: 1px solid var(--line); padding-top: 16px; margin-top: 20px;">
          <h4>Thông tin liên hệ (theo thiết lập quyền riêng tư)</h4>
          <div style="font-size: 0.88rem; margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
            <div><b>Email:</b> ${s.email ? `<a href="mailto:${s.email}">${s.email}</a>` : '<span style="color: var(--mute);">Được người dùng bảo mật</span>'}</div>
            <div><b>Điện thoại:</b> ${s.phone ? s.phone : '<span style="color: var(--mute);">Được người dùng bảo mật</span>'}</div>
            <div><b>Mạng xã hội:</b> ${s.socialLink ? `<a href="${s.socialLink}" target="_blank">${s.socialLink}</a>` : '<span style="color: var(--mute);">Chưa chia sẻ</span>'}</div>
          </div>
        </div>

        <div style="margin-top: 24px;">
          <button class="btn btn-primary" style="width: 100%;" onclick="app.closeStudentModal(); app.sendConnectInvite('${s.userId}', '${s.fullName.replace(/'/g, "\\'")}')">Gửi Lời Mời Kết Nối Teammate 🤝</button>
        </div>
      `;

      document.getElementById('modal-student-detail').classList.add('active');
    } catch (err) {
      alert(err.message);
    }
  },

  closeStudentModal() {
    document.getElementById('modal-student-detail').classList.remove('active');
  },

  async sendConnectInvite(receiverId, receiverName) {
    const msg = prompt(`Gửi tin nhắn ngỏ lời kết nối tới ${receiverName}:`, 'Chào bạn, mình thấy thế mạnh của bạn rất phù hợp với đề tài đồ án của nhóm mình. Rất mong được trao đổi thêm!');
    if (!msg) return;

    try {
      const res = await fetch('/api/connections/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId, message: msg })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      this.showToast(data.message || 'Đã gửi lời mời!');
    } catch (err) {
      alert(err.message);
    }
  },

  // ----------------------------------------------------
  // PROFILE & PRIVACY ONBOARDING
  // ----------------------------------------------------
  async loadProfile() {
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) throw new Error('Không thể tải hồ sơ.');
      const p = await res.json();

      document.getElementById('prof-fullName').value = p.fullName || '';
      document.getElementById('prof-studentId').value = p.studentId || '';
      document.getElementById('prof-classYear').value = p.classYear || 'K17';
      document.getElementById('prof-teamStatus').value = p.teamStatus || 'Đang tìm teammate';
      document.getElementById('prof-desiredRole').value = p.desiredRole || '';
      document.getElementById('prof-bio').value = p.bio || '';
      document.getElementById('prof-skills').value = (p.skills || []).join(', ');
      document.getElementById('prof-interests').value = (p.projectInterests || []).join(', ');
      document.getElementById('prof-phone').value = p.phone || '';
      document.getElementById('prof-social').value = p.socialLink || '';

      // Privacy checks
      document.getElementById('priv-published').checked = Boolean(p.isPublished);
      document.getElementById('priv-dir-visible').checked = Boolean(p.directoryVisible);
      document.getElementById('priv-show-strengths').checked = Boolean(p.showStrengths);
      document.getElementById('priv-show-email').checked = Boolean(p.showEmail);
      document.getElementById('priv-show-phone').checked = Boolean(p.showPhone);
      document.getElementById('priv-show-social').checked = Boolean(p.showSocial);

      // Warning banner if unpublished
      document.getElementById('profile-unpublished-banner').style.display = p.isPublished ? 'none' : 'block';

      // Strength summary preview
      const strBox = document.getElementById('profile-strength-content');
      if (p.assessment) {
        strBox.innerHTML = `
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
            <span class="badge-strength badge-${p.assessment.primaryStrength}">Chính: ${p.assessment.primaryStrength}</span>
            <span class="badge-strength badge-${p.assessment.secondaryStrength}">Phụ: ${p.assessment.secondaryStrength}</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--mute);">Hoàn thành lúc: ${new Date(p.assessment.completedAt).toLocaleString('vi-VN')}</div>
        `;
      } else {
        strBox.innerHTML = `
          <p style="color: var(--mute); font-size: 0.88rem;">Bạn chưa thực hiện bài Mini Test 15 câu.</p>
          <button class="btn btn-primary btn-sm" style="margin-top: 8px;" onclick="app.startTest()">Làm bài test ngay 🚀</button>
        `;
      }

      // Load connection requests
      this.loadConnectionRequests();
    } catch (err) {
      console.error(err);
    }
  },

  async saveProfile(e) {
    e.preventDefault();
    const skills = document.getElementById('prof-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    const projectInterests = document.getElementById('prof-interests').value.split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
      fullName: document.getElementById('prof-fullName').value.trim(),
      studentId: document.getElementById('prof-studentId').value.trim(),
      classYear: document.getElementById('prof-classYear').value,
      teamStatus: document.getElementById('prof-teamStatus').value,
      desiredRole: document.getElementById('prof-desiredRole').value.trim(),
      bio: document.getElementById('prof-bio').value.trim(),
      phone: document.getElementById('prof-phone').value.trim(),
      socialLink: document.getElementById('prof-social').value.trim(),
      skills,
      projectInterests
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      this.showToast(data.message || 'Đã lưu thông tin hồ sơ.');
      await this.fetchCurrentUser();
    } catch (err) {
      alert(err.message);
    }
  },

  async savePrivacy(e) {
    e.preventDefault();
    const payload = {
      isPublished: document.getElementById('priv-published').checked,
      directoryVisible: document.getElementById('priv-dir-visible').checked,
      showStrengths: document.getElementById('priv-show-strengths').checked,
      showEmail: document.getElementById('priv-show-email').checked,
      showPhone: document.getElementById('priv-show-phone').checked,
      showSocial: document.getElementById('priv-show-social').checked
    };

    try {
      const res = await fetch('/api/profile/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      this.showToast(data.message || 'Đã lưu quyền riêng tư.');
      this.loadProfile();
    } catch (err) {
      alert(err.message);
    }
  },

  async loadConnectionRequests() {
    try {
      const res = await fetch('/api/connections');
      if (!res.ok) return;
      const data = await res.json();
      const list = document.getElementById('connections-list');
      list.innerHTML = '';

      if (data.incoming.length === 0 && data.outgoing.length === 0) {
        list.innerHTML = '<p style="color: var(--mute); font-size: 0.85rem;">Chưa có lời mời kết nối nào.</p>';
        return;
      }

      data.incoming.forEach(inc => {
        const item = document.createElement('div');
        item.style.cssText = 'background: var(--surface-alt); padding: 12px; border-radius: 8px; margin-bottom: 8px; font-size: 0.88rem;';
        item.innerHTML = `
          <div style="font-weight: 700;">Từ: ${inc.sender_name} <span class="badge-strength badge-${inc.sender_primary_strength}" style="font-size: 0.7rem;">${inc.sender_primary_strength}</span></div>
          <div style="color: var(--ink-secondary); margin: 4px 0;">"${inc.message}"</div>
          <div style="font-size: 0.75rem; color: var(--mute);">Trạng thái: <b>${inc.status}</b></div>
        `;
        list.appendChild(item);
      });
    } catch (err) {
      console.error(err);
    }
  },

  // ----------------------------------------------------
  // COMMUNITY BOARD
  // ----------------------------------------------------
  async loadCommunityPosts() {
    try {
      const res = await fetch('/api/community/posts');
      if (!res.ok) return;
      const data = await res.json();
      const container = document.getElementById('community-posts-container');
      container.innerHTML = '';

      if (data.posts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--mute);">Chưa có bài viết nào trên bảng tin.</p>';
        return;
      }

      data.posts.forEach(p => {
        const card = document.createElement('div');
        card.style.cssText = 'background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow);';

        const tagsHtml = (p.looking_for_strengths || []).map(str =>
          `<span class="badge-strength badge-${str}" style="font-size: 0.72rem;">Cần: ${str}</span>`
        ).join(' ');

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div style="display: flex; gap: 12px; align-items: center;">
              <img style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;" src="${p.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}">
              <div>
                <div style="font-weight: 700; font-size: 1rem;">${p.author_name} ${p.author_is_demo ? '<span class="badge-demo">Demo</span>' : ''}</div>
                <div style="font-size: 0.78rem; color: var(--mute);">${p.author_class || 'Sinh viên'} · ${new Date(p.created_at).toLocaleDateString('vi-VN')}</div>
              </div>
            </div>
            ${p.author_primary_strength ? `<span class="badge-strength badge-${p.author_primary_strength}">${p.author_primary_strength}</span>` : ''}
          </div>

          <h3 style="margin-bottom: 8px; font-size: 1.15rem;">${p.title}</h3>
          <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">${tagsHtml}</div>
          <p style="color: var(--ink-secondary); font-size: 0.92rem; margin-bottom: 16px; white-space: pre-line;">${p.content}</p>

          <div style="display: flex; gap: 14px; border-top: 1px solid var(--line); padding-top: 12px; align-items: center;">
            <button class="btn ${p.user_liked ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="app.toggleLike('${p.id}')">
              ❤️ Thích (${p.likes_count})
            </button>
            <button class="btn btn-outline btn-sm" onclick="app.sendConnectInvite('${p.author_id}', '${p.author_name.replace(/'/g, "\\'")}')">
              Gửi lời mời kết nối 🤝
            </button>
          </div>
        `;
        container.appendChild(card);
      });
    } catch (err) {
      console.error(err);
    }
  },

  async toggleLike(postId) {
    if (!this.currentUser) {
      this.openAuthModal('login');
      return;
    }
    try {
      await fetch(`/api/community/posts/${postId}/like`, { method: 'POST' });
      this.loadCommunityPosts();
    } catch (e) {
      console.error(e);
    }
  },

  openCreatePostModal() {
    if (!this.currentUser) {
      this.openAuthModal('login');
      return;
    }
    document.getElementById('modal-create-post').classList.add('active');
  },

  closeCreatePostModal() {
    document.getElementById('modal-create-post').classList.remove('active');
  },

  async submitNewPost(e) {
    e.preventDefault();
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const checked = Array.from(document.querySelectorAll('input[name="post-str"]:checked')).map(cb => cb.value);

    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, lookingForStrengths: checked })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.closeCreatePostModal();
      this.showToast('Đã đăng bài viết mới thành công!');
      this.loadCommunityPosts();
    } catch (err) {
      alert(err.message);
    }
  },

  // ----------------------------------------------------
  // ADMIN DASHBOARD & WORKSHOP GROUPING
  // ----------------------------------------------------
  switchAdminTab(tabName) {
    document.querySelectorAll('.tabs-nav .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('onclick').includes(tabName));
    });

    document.getElementById('admin-tab-overview').style.display = tabName === 'overview' ? 'block' : 'none';
    document.getElementById('admin-tab-grouping').style.display = tabName === 'grouping' ? 'block' : 'none';
    document.getElementById('admin-tab-confirmed-teams').style.display = tabName === 'confirmed-teams' ? 'block' : 'none';
    document.getElementById('admin-tab-participants').style.display = tabName === 'participants' ? 'block' : 'none';

    if (tabName === 'overview') this.loadAdminOverview();
    if (tabName === 'confirmed-teams') this.loadConfirmedTeams();
    if (tabName === 'participants') this.loadAdminParticipants();
  },

  toggleAdminDemoFilter() {
    this.loadAdminOverview();
    if (document.getElementById('admin-tab-participants').style.display === 'block') {
      this.loadAdminParticipants();
    }
  },

  async loadAdminOverview() {
    const includeDemo = document.getElementById('admin-include-demo-toggle').checked;
    try {
      const res = await fetch(`/api/admin/metrics?includeDemo=${includeDemo}`);
      if (!res.ok) return;
      const data = await res.json();

      document.getElementById('adm-stat-students').innerText = data.totalStudents;
      document.getElementById('adm-stat-tests').innerText = data.completedAssessments;
      document.getElementById('adm-stat-teams').innerText = data.confirmedTeamsCount;
      document.getElementById('adm-stat-posts').innerText = data.totalPosts;

      // Strength distribution bars
      const bars = document.getElementById('admin-strength-bars');
      bars.innerHTML = '';
      const total = Object.values(data.strengthDist).reduce((a, b) => a + b, 0) || 1;

      const colors = {
        Communication: 'var(--str-comm)',
        Creativity: 'var(--str-creat)',
        Research: 'var(--str-res)',
        Leadership: 'var(--str-lead)',
        'Problem-solving': 'var(--str-prob)'
      };

      for (const [key, count] of Object.entries(data.strengthDist)) {
        const pct = Math.round((count / total) * 100);
        bars.innerHTML += `
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 4px;">
              <span><b>${key}</b></span>
              <span>${count} sinh viên (${pct}%)</span>
            </div>
            <div style="height: 10px; background: var(--line); border-radius: 999px; overflow: hidden;">
              <div style="height: 100%; width: ${pct}%; background: ${colors[key]}; border-radius: 999px;"></div>
            </div>
          </div>
        `;
      }

      // Status breakdown
      const statBox = document.getElementById('admin-status-breakdown');
      statBox.innerHTML = '';
      for (const [status, count] of Object.entries(data.statusDist)) {
        statBox.innerHTML += `
          <div style="background: var(--surface-alt); padding: 14px; border-radius: 8px; border: 1px solid var(--line);">
            <div style="font-size: 0.82rem; color: var(--mute);">${status}</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--ink); margin-top: 4px;">${count}</div>
          </div>
        `;
      }
    } catch (err) {
      console.error(err);
    }
  },

  async generateProposedTeams() {
    const includeDemo = document.getElementById('admin-include-demo-toggle').checked;
    const teamCount = parseInt(document.getElementById('group-team-count').value, 10) || 6;
    const targetTeamSize = parseInt(document.getElementById('group-team-size').value, 10) || 5;

    try {
      const res = await fetch('/api/admin/teams/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeDemo, teamCount, targetTeamSize })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.proposedTeamsState = data.teams;
      this.renderProposedTeams(data);
    } catch (err) {
      alert(err.message);
    }
  },

  renderProposedTeams(data) {
    const container = document.getElementById('grouping-teams-container');
    container.innerHTML = '';

    // Feasibility banner
    const feasBanner = document.getElementById('grouping-feasibility-banner');
    if (data.metrics.feasibilityWarning) {
      feasBanner.style.display = 'block';
      feasBanner.innerHTML = `<b>⚠️ Lưu ý toán học phân nhóm:</b> ${data.metrics.feasibilityWarning}`;
    } else {
      feasBanner.style.display = 'none';
    }

    // Summary metrics
    const sumBox = document.getElementById('grouping-metrics-summary');
    sumBox.style.display = 'grid';
    document.getElementById('met-total-eligible').innerText = data.metrics.totalEligible;
    document.getElementById('met-total-assigned').innerText = data.metrics.totalAssigned;
    document.getElementById('met-perfect-teams').innerText = `${data.metrics.perfectTeamsCount} / ${data.metrics.teamsGenerated}`;
    document.getElementById('met-repeat-teams').innerText = data.metrics.teamsWithRepeatsCount;

    document.getElementById('grouping-action-bar').style.display = 'flex';

    // Render each proposed team
    data.teams.forEach(team => {
      const box = document.createElement('div');
      box.className = 'team-box';

      let divPillClass = 'diversity-5';
      if (team.diversityScore === 4) divPillClass = 'diversity-4';
      if (team.diversityScore < 4) divPillClass = 'diversity-low';

      const missingTags = team.missingPrimaryStrengths.length > 0
        ? `<div style="font-size: 0.78rem; color: #dc2626; margin-bottom: 8px;"><b>Thiếu chính:</b> ${team.missingPrimaryStrengths.join(', ')}</div>`
        : '';

      const repeatTags = team.repeatedPrimaryStrengths.length > 0
        ? `<div style="font-size: 0.78rem; color: #d97706; margin-bottom: 8px;"><b>Lặp chính:</b> ${team.repeatedPrimaryStrengths.join(', ')}</div>`
        : '';

      const secCovered = team.secondaryStrengthsCovered.length > 0
        ? `<div style="font-size: 0.78rem; color: #0284c7; margin-bottom: 12px;"><b>Bù đắp thế mạnh phụ:</b> ${team.secondaryStrengthsCovered.join(', ')}</div>`
        : '';

      let membersHtml = '';
      team.members.forEach(m => {
        membersHtml += `
          <div class="team-member-item">
            <div class="team-member-left">
              <img class="avatar-micro" src="${m.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}">
              <div>
                <div style="font-weight: 700;">${m.fullName}</div>
                <div style="font-size: 0.75rem; color: var(--mute);">${m.classYear || ''} · Phụ: ${m.secondaryStrength || 'Không'}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge-strength badge-${m.primaryStrength}" style="font-size: 0.7rem;">${m.primaryStrength}</span>
              <button class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 0.72rem;" onclick="app.openReassignModal('${m.userId}', '${m.fullName.replace(/'/g, "\\'")}', ${team.teamNumber})">Chuyển ⇄</button>
            </div>
          </div>
        `;
      });

      box.innerHTML = `
        <div class="team-box-header">
          <div>
            <h4 style="font-size: 1.15rem; margin: 0;">${team.teamName} (${team.members.length} bạn)</h4>
          </div>
          <span class="team-diversity-pill ${divPillClass}">
            ${team.diversityScore}/5 thế mạnh ${team.hasAllFive ? '★' : ''}
          </span>
        </div>

        ${missingTags}
        ${repeatTags}
        ${secCovered}

        <div class="team-member-list">
          ${membersHtml}
        </div>
      `;

      container.appendChild(box);
    });
  },

  openReassignModal(userId, fullName, currentTeamNumber) {
    this.reassignTargetUserId = userId;
    document.getElementById('reassign-modal-desc').innerText = `Chuyển sinh viên ${fullName} từ Nhóm ${currentTeamNumber} sang nhóm khác:`;

    const select = document.getElementById('reassign-target-team');
    select.innerHTML = '';

    for (let i = 1; i <= this.proposedTeamsState.length; i++) {
      if (i !== currentTeamNumber) {
        select.innerHTML += `<option value="${i}">Nhóm ${i}</option>`;
      }
    }

    document.getElementById('modal-reassign').classList.add('active');
  },

  closeReassignModal() {
    document.getElementById('modal-reassign').classList.remove('active');
  },

  async executeReassignment() {
    const targetTeam = document.getElementById('reassign-target-team').value;
    try {
      const res = await fetch('/api/admin/teams/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teams: this.proposedTeamsState,
          userId: this.reassignTargetUserId,
          targetTeamNumber: targetTeam
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.proposedTeamsState = data.teams;
      this.closeReassignModal();
      this.showToast(`Đã chuyển thành công sang Nhóm ${targetTeam}!`);

      // Re-evaluate metrics for display
      const totalEligible = this.proposedTeamsState.reduce((acc, t) => acc + t.members.length, 0);
      const perfectTeamsCount = data.metrics.perfectTeamsCount;
      const teamsWithRepeatsCount = data.metrics.teamsWithRepeatsCount;

      this.renderProposedTeams({
        teams: this.proposedTeamsState,
        metrics: {
          totalEligible,
          totalAssigned: totalEligible,
          perfectTeamsCount,
          teamsWithRepeatsCount,
          teamsGenerated: this.proposedTeamsState.length,
          feasibilityWarning: null
        }
      });
    } catch (err) {
      alert(err.message);
    }
  },

  async confirmAndSaveTeams() {
    if (!this.proposedTeamsState || this.proposedTeamsState.length === 0) return;

    if (!confirm('Bạn có chắc chắn muốn xác nhận và lưu danh sách phân nhóm này vào hệ thống? Danh sách trước đó sẽ được cập nhật.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/teams/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: this.proposedTeamsState })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      this.showToast(`Đã xác nhận và lưu thành công ${data.teamCount} nhóm vào cơ sở dữ liệu!`);
      this.switchAdminTab('confirmed-teams');
    } catch (err) {
      alert(err.message);
    }
  },

  async loadConfirmedTeams() {
    try {
      const res = await fetch('/api/admin/teams/confirmed');
      if (!res.ok) return;
      const data = await res.json();
      const container = document.getElementById('confirmed-teams-container');
      container.innerHTML = '';

      if (data.teams.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--surface); border-radius: var(--radius); border: 1px dashed var(--line);">
            <p style="color: var(--mute);">Chưa có danh sách nhóm nào được xác nhận lưu trữ.</p>
            <button class="btn btn-primary" style="margin-top: 12px;" onclick="app.switchAdminTab('grouping')">Đi đến Phân nhóm thông minh ⚡</button>
          </div>
        `;
        return;
      }

      data.teams.forEach(t => {
        const box = document.createElement('div');
        box.className = 'team-box';

        let membersHtml = '';
        t.members.forEach(m => {
          membersHtml += `
            <div class="team-member-item">
              <div class="team-member-left">
                <img class="avatar-micro" src="${m.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}">
                <div>
                  <div style="font-weight: 700;">${m.fullName} ${m.isDemo ? '<span class="badge-demo">Demo</span>' : ''}</div>
                  <div style="font-size: 0.75rem; color: var(--mute);">${m.phone ? 'SĐT: ' + m.phone : m.email}</div>
                </div>
              </div>
              <span class="badge-strength badge-${m.primaryStrength}" style="font-size: 0.7rem;">${m.primaryStrength}</span>
            </div>
          `;
        });

        box.innerHTML = `
          <div class="team-box-header">
            <h4>${t.teamName} (${t.members.length} bạn)</h4>
            <span class="team-diversity-pill diversity-5">${t.diversityScore}/5 thế mạnh</span>
          </div>
          <div class="team-member-list">
            ${membersHtml}
          </div>
        `;
        container.appendChild(box);
      });
    } catch (err) {
      console.error(err);
    }
  },

  async loadAdminParticipants() {
    const includeDemo = document.getElementById('admin-include-demo-toggle').checked;
    try {
      const res = await fetch(`/api/admin/participants?includeDemo=${includeDemo}`);
      if (!res.ok) return;
      const data = await res.json();
      const tbody = document.getElementById('admin-participants-tbody');
      tbody.innerHTML = '';

      data.participants.forEach(p => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--line)';
        tr.innerHTML = `
          <td style="padding: 12px 16px;">
            <div style="font-weight: 700;">${p.fullName}</div>
            <div style="font-size: 0.75rem; color: var(--mute);">${p.studentId || 'Chưa cập nhật'}</div>
          </td>
          <td style="padding: 12px 16px;">${p.classYear || '-'}</td>
          <td style="padding: 12px 16px;">${p.email}</td>
          <td style="padding: 12px 16px;"><span class="badge-strength badge-${p.primaryStrength}">${p.primaryStrength}</span></td>
          <td style="padding: 12px 16px;"><span class="badge-strength badge-${p.secondaryStrength}" style="opacity: 0.85;">${p.secondaryStrength}</span></td>
          <td style="padding: 12px 16px; font-size: 0.82rem;">
            ${p.scores.Communication}/${p.scores.Creativity}/${p.scores.Research}/${p.scores.Leadership}/${p.scores['Problem-solving']} (15)
          </td>
          <td style="padding: 12px 16px;"><span class="badge-status status-finding">${p.teamStatus}</span></td>
          <td style="padding: 12px 16px;">${p.isDemo ? '<span class="badge-demo">Demo</span>' : '<span style="color: #166534; font-weight: 700;">Thật</span>'}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error(err);
    }
  },

  exportWorkshopData(format = 'csv') {
    const includeDemo = document.getElementById('admin-include-demo-toggle').checked;
    window.open(`/api/admin/export?format=${format}&includeDemo=${includeDemo}`, '_blank');
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
