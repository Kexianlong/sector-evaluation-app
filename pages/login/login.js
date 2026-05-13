const app = getApp();
const { isManagerRole, isInstructorRole } = require('../../utils/roles.js');
const { normalizeApiResponse } = require('../../utils/api.js');

function homeTabPath(role) {
  if (isManagerRole(role)) return '/pages/overview/overview';
  return '/pages/radar/radar';
}

Page({
  data: {
    username: '',
    password: '',
    loading: false,
    error: '',
    showPasswordModal: false,
    showPasswordForm: false,
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    passwordError: '',
    passwordSuccess: '',
    pendingToken: null,
    showProfileModal: false,
    profileGender: '',
    profileBirthDate: '',
    profileGroupEntryDate: '',
    profileIsStudent: false,
    profileIsInstructor: false,
    profileError: '',
    _profileUser: null,
    usingDefaultPassword: false,
    profilePhone: '',
    profilePhotoUrl: '',
    profileIcaoDate: '',
    profileMedicalDate: '',
    profileResponsibleStudents: [],
    profileResponsibleStudentsInfo: [],
    profileResponsibleInstructor: '',
    profileResponsibleInstructorLabel: '',
    profileResponsibleStudentsLabel: '',
    profileResponsibleInstructorIndex: 0,
    instructorStudentList: [],
    studentInstructorList: [],
    allStudents: [],
    allInstructors: []
  },

  onLoad() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (token && userInfo) {
      app.globalData.token = token;
      app.globalData.userInfo = userInfo;
      wx.switchTab({ url: homeTabPath(userInfo.role) });
      return;
    }
  },

  onInputUsername(e) {
    this.setData({ username: e.detail.value });
  },

  onInputPassword(e) {
    this.setData({ password: e.detail.value });
  },

  onInputOldPassword(e) {
    this.setData({ oldPassword: e.detail.value });
  },

  onInputNewPassword(e) {
    this.setData({ newPassword: e.detail.value });
  },

  onInputConfirmPassword(e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  async handleLogin() {
    if (this.data.loading) return;
    const username = this.data.username;
    const password = this.data.password;

    if (!username || !password) {
      this.setData({ error: '请输入账号和密码' });
      return;
    }

    this.setData({ loading: true, error: '' });

    try {
      const res = normalizeApiResponse(await app.request({
        url: '/auth/login',
        method: 'POST',
        data: { username, password }
      }));

      if (res && res.success && res.data && res.data.token) {
        const loginedUser = res.data.userInfo || res.data.user || {};
        const requirePasswordChange = (res.data && res.data.requirePasswordChange);
        wx.setStorageSync('token', res.data.token);
        wx.setStorageSync('userInfo', loginedUser);
        app.globalData.token = res.data.token;
        app.globalData.userInfo = loginedUser;
        this.setData({
          loading: false,
          usingDefaultPassword: !!requirePasswordChange,
          pendingToken: res.data.token,
          oldPassword: password,
          newPassword: '',
          confirmPassword: '',
          passwordError: '',
          passwordSuccess: ''
        });
        this.checkProfileCompletion(loginedUser);
      } else {
        const errMsg = (res && res.message) || '';
        const errCode = (res && res.code) || '';
        if (errMsg && errMsg.indexOf('已经放单') !== -1) {
          this.setData({ error: errMsg, loading: false });
          return;
        }
        if (errCode === 'FORBIDDEN') {
          this.setData({ error: errMsg || '账号无权限', loading: false });
          return;
        }
        if (res && res.success === false && errMsg) {
          if (errCode === 'UNAUTHORIZED' || (errMsg.indexOf('Unauthorized') !== -1 || errMsg.indexOf('401') !== -1)) {
            this.setData({ error: errMsg || '账号或密码错误，请检查后重试', loading: false });
            return;
          }
          this.setData({ error: errMsg, loading: false });
          return;
        }
        this.setData({ error: '登录失败，请稍后重试', loading: false });
      }
    } catch (err) {
      const msg = (err && err.message) || '';
      if (msg.includes('密码已经重置')) {
        this.setData({ error: '密码已经重置，请使用默认密码登录', loading: false });
      } else {
        console.log('[login] 后端登录失败', msg);
        this.setData({ error: '网络异常，请稍后重试', loading: false });
      }
    }
  },

  handleCancelPasswordChange() {
    const { pendingToken } = this.data;
    this.setData({ showPasswordModal: false, showPasswordForm: false });
    if (pendingToken) {
      wx.setStorageSync('token', pendingToken);
      app.globalData.token = pendingToken;
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        app.globalData.userInfo = userInfo;
        wx.switchTab({ url: homeTabPath(userInfo.role || 'student') });
      } else {
        wx.showToast({ title: '登录信息异常，请重新登录', icon: 'none' });
      }
    }
  },

  handleShowPasswordForm() {
    this.setData({ showPasswordForm: true, passwordError: '', passwordSuccess: '' });
  },

  async handleChangePassword() {
    const { oldPassword, newPassword, confirmPassword, pendingToken } = this.data;
    this.setData({ passwordError: '', passwordSuccess: '' });

    if (!newPassword || newPassword.length < 6) {
      this.setData({ passwordError: '新密码长度至少为6个字符' });
      return;
    }
    if (newPassword !== confirmPassword) {
      this.setData({ passwordError: '两次输入的新密码不一致' });
      return;
    }

    try {
      const res = normalizeApiResponse(await app.request({
        url: '/auth/password',
        method: 'PUT',
        data: { oldPassword, newPassword },
        header: {
          'Authorization': `Bearer ${pendingToken}`
        }
      }));
      if (res && res.success) {
        this.setData({ passwordSuccess: '密码修改成功，请使用新密码重新登录' });
        setTimeout(() => {
          this.setData({
            showPasswordModal: false,
            showPasswordForm: false,
            pendingToken: null,
            password: ''
          });
        }, 1500);
      } else {
        this.setData({ passwordError: res.message || '修改密码失败' });
      }
    } catch (err) {
      this.setData({ passwordError: (err && err.message) || '修改密码失败' });
    }
  },

  checkProfileCompletion(userInfo) {
    const { isStudentRole, isInstructorRole } = require('../../utils/roles.js');
    var needsCompletion = !userInfo.gender || !userInfo.birthDate || !userInfo.phone;
    if (isStudentRole(userInfo.role) && !userInfo.groupEntryDate) {
      needsCompletion = true;
    }
    if (needsCompletion) {
      const skipUntil = wx.getStorageSync('profile_skip_until');
      const now = Date.now();
      if (!skipUntil || now > skipUntil) {
        this.setData({
          showProfileModal: true,
          profileGender: userInfo.gender || '',
          profileBirthDate: userInfo.birthDate || '',
          profileGroupEntryDate: userInfo.groupEntryDate || '',
          profilePhone: userInfo.phone || '',
          profilePhotoUrl: userInfo.photoUrl || '',
          profileIcaoDate: userInfo.icaoDate || '',
          profileMedicalDate: userInfo.medicalDate || '',
          profileIsStudent: isStudentRole(userInfo.role),
          profileIsInstructor: isInstructorRole(userInfo.role),
          profileResponsibleStudents: userInfo.responsibleStudents || [],
          profileResponsibleInstructor: userInfo.responsibleInstructor || '',
          profileError: '',
          _profileUser: userInfo
        });
        this.loadResponsibleLists(userInfo);
        return;
      }
    }
    if (this.data.usingDefaultPassword) {
      this.setData({ showPasswordModal: true, showPasswordForm: false });
      return;
    }
    wx.switchTab({ url: homeTabPath(userInfo.role) });
  },

  async loadResponsibleLists(userInfo) {
    const { isStudentRole, isInstructorRole } = require('../../utils/roles.js');
    try {
      // 加载学员列表（给教员选）
      if (isInstructorRole(userInfo.role)) {
        const studentsRes = await app.request({ url: '/users/students' });
        let students = [];
        if (Array.isArray(studentsRes)) students = studentsRes;
        else if (studentsRes && studentsRes.success && Array.isArray(studentsRes.data)) students = studentsRes.data;
        const studentNames = students.map(s => s.name || s.username);
        const currentIds = userInfo.responsibleStudents || [];
        const currentInfo = students.filter(s => currentIds.includes(s.userId));
        this.setData({
          allStudents: students,
          instructorStudentList: studentNames.length ? studentNames : ['暂无学员'],
          profileResponsibleStudentsInfo: currentInfo,
          profileResponsibleStudentsLabel: currentInfo.map(i => i.name).join('、') || ''
        });
      }
      // 加载教员列表（给学员选）
      if (isStudentRole(userInfo.role)) {
        const instructorsRes = await app.request({ url: '/users/instructors' });
        let instructors = [];
        if (Array.isArray(instructorsRes)) instructors = instructorsRes;
        else if (instructorsRes && instructorsRes.success && Array.isArray(instructorsRes.data)) instructors = instructorsRes.data;
        const instructorNames = instructors.map(i => i.name || i.username);
        const currentIndex = instructors.findIndex(i => i.userId === userInfo.responsibleInstructor);
        this.setData({
          allInstructors: instructors,
          studentInstructorList: instructorNames.length ? instructorNames : ['暂无教员'],
          profileResponsibleInstructorIndex: currentIndex >= 0 ? currentIndex : 0,
          profileResponsibleInstructorLabel: currentIndex >= 0 ? instructors[currentIndex].name : ''
        });
      }
    } catch (e) {
      console.log('[login] 加载责任关系列表失败', e);
    }
  },

  onProfileGenderChange(e) {
    const genders = ['男', '女'];
    this.setData({ profileGender: genders[Number(e.detail.value)] });
  },

  onProfileBirthDateChange(e) {
    this.setData({ profileBirthDate: e.detail.value });
  },

  onProfileGroupEntryDateChange(e) {
    this.setData({ profileGroupEntryDate: e.detail.value });
  },

  onProfilePhoneInput(e) {
    this.setData({ profilePhone: e.detail.value });
  },

  onGetPhoneNumber(e) {
    if (e.detail.errMsg && e.detail.errMsg.indexOf('ok') !== -1) {
      // 真实环境下需后端解密，这里先模拟直接使用
      const phone = e.detail.phoneNumber || e.detail.encryptedData;
      if (phone && phone.length === 11) {
        this.setData({ profilePhone: phone });
        wx.showToast({ title: '已获取手机号', icon: 'success' });
      } else {
        wx.showToast({ title: '获取手机号失败，请手动输入', icon: 'none' });
      }
    } else {
      wx.showToast({ title: '请授权手机号或手动输入', icon: 'none' });
    }
  },

  chooseProfileAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFile = res.tempFiles[0];
        if (!tempFile) return;
        wx.showLoading({ title: '处理中' });
        const fs = wx.getFileSystemManager();
        fs.readFile({
          filePath: tempFile.tempFilePath,
          encoding: 'base64',
          success: (readRes) => {
            const base64 = 'data:image/jpeg;base64,' + readRes.data;
            this.setData({ profilePhotoUrl: base64 });
            wx.showToast({ title: '设置成功', icon: 'success' });
          },
          fail: () => wx.showToast({ title: '读取图片失败', icon: 'none' }),
          complete: () => wx.hideLoading()
        });
      }
    });
  },

  onProfileIcaoDateChange(e) {
    this.setData({ profileIcaoDate: e.detail.value });
  },

  onProfileMedicalDateChange(e) {
    this.setData({ profileMedicalDate: e.detail.value });
  },

  onProfileResponsibleInstructorChange(e) {
    const index = Number(e.detail.value);
    const instructor = this.data.allInstructors[index];
    if (instructor) {
      this.setData({
        profileResponsibleInstructor: instructor.userId,
        profileResponsibleInstructorLabel: instructor.name,
        profileResponsibleInstructorIndex: index
      });
    }
  },

  onProfileResponsibleStudentsChange(e) {
    const index = Number(e.detail.value[0] || e.detail.value);
    const student = this.data.allStudents[index];
    if (!student) return;
    const current = this.data.profileResponsibleStudents.slice();
    const currentInfo = this.data.profileResponsibleStudentsInfo.slice();
    if (!current.includes(student.userId)) {
      current.push(student.userId);
      currentInfo.push(student);
      this.setData({
        profileResponsibleStudents: current,
        profileResponsibleStudentsInfo: currentInfo,
        profileResponsibleStudentsLabel: currentInfo.map(i => i.name).join('、')
      });
    }
  },

  removeResponsibleStudent(e) {
    const userId = e.currentTarget.dataset.id;
    const current = this.data.profileResponsibleStudents.filter(id => id !== userId);
    const currentInfo = this.data.profileResponsibleStudentsInfo.filter(s => s.userId !== userId);
    this.setData({
      profileResponsibleStudents: current,
      profileResponsibleStudentsInfo: currentInfo,
      profileResponsibleStudentsLabel: currentInfo.map(i => i.name).join('、')
    });
  },

  async handleProfileSave() {
    const { profileGender, profileBirthDate, profileGroupEntryDate, profileIsStudent, profilePhone, profilePhotoUrl, profileIcaoDate, profileMedicalDate, profileResponsibleStudents, profileResponsibleInstructor, _profileUser } = this.data;
    if (!profileGender) { this.setData({ profileError: '请选择性别' }); return; }
    if (!profileBirthDate) { this.setData({ profileError: '请选择出生日期' }); return; }
    if (!profilePhone) { this.setData({ profileError: '请输入手机号码' }); return; }
    if (profileIsStudent && !profileGroupEntryDate) { this.setData({ profileError: '请选择进组时间' }); return; }

    try {
      const updateData = {
        gender: profileGender,
        birthDate: profileBirthDate,
        phone: profilePhone,
        photoUrl: profilePhotoUrl || '',
        icaoDate: profileIcaoDate || '',
        medicalDate: profileMedicalDate || ''
      };
      if (profileIsStudent) {
        updateData.groupEntryDate = profileGroupEntryDate;
        updateData.responsibleInstructor = profileResponsibleInstructor || '';
      }
      if (this.data.profileIsInstructor) {
        updateData.responsibleStudents = profileResponsibleStudents || [];
      }
      await app.request({
        url: '/auth/me',
        method: 'PUT',
        data: updateData
      });
      Object.assign(_profileUser, updateData);
      wx.setStorageSync('userInfo', _profileUser);
      app.globalData.userInfo = _profileUser;
    } catch (e) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      return;
    }
    this.setData({ showProfileModal: false });
    wx.switchTab({ url: homeTabPath(_profileUser.role) });
  },

  handleProfileSkip() {
    wx.setStorageSync('profile_skip_until', Date.now() + 24 * 60 * 60 * 1000);
    this.setData({ showProfileModal: false });
    const userInfo = this.data._profileUser || {};
    if (this.data.usingDefaultPassword) {
      this.setData({ showPasswordModal: true, showPasswordForm: false });
      return;
    }
    wx.switchTab({ url: homeTabPath(userInfo.role) });
  },

  switchToPasswordModal() {
    this.setData({ showProfileModal: false, showPasswordModal: true, showPasswordForm: true });
  },

  copyWebUrl(e) {
    const url = e.currentTarget.dataset.url;
    wx.setClipboardData({
      data: url,
      success: () => {
        this.setData({ copyTip: true });
        // URL 已复制到剪贴板
        setTimeout(() => this.setData({ copyTip: false }), 2500);
      }
    });
  }
});
