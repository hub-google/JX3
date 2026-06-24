// JX3 Blog - Firebase Authentication

// TODO: 將下方的 firebaseConfig 替換為您自己的 Firebase 專案設定！
const firebaseConfig = {
  apiKey: "AIzaSyCZkppM0DHmqmalAWO__G2zlh9g6clUY20",
  authDomain: "sign-a70b0.firebaseapp.com",
  projectId: "sign-a70b0",
  storageBucket: "sign-a70b0.firebasestorage.app",
  messagingSenderId: "151361216524",
  appId: "1:151361216524:web:87728f686c5b56530ece29",
  measurementId: "G-1X9YMN4QM1"
};

// Initialize Firebase only if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const Auth = {
    currentUser: null,

    init() {
        // Listen for authentication state changes
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // User is signed in.
                if (!user.emailVerified) {
                    // Do not treat as logged in if not verified
                    this.currentUser = null;
                } else {
                    this.currentUser = {
                        uid: user.uid,
                        username: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        emailVerified: user.emailVerified
                    };
                }
            } else {
                // User is signed out.
                this.currentUser = null;
            }
            this.updateUI();
        });
    },

    updateUI() {
        const authSection = document.getElementById('auth-section');
        if (authSection && typeof Templates !== 'undefined') {
            authSection.innerHTML = Templates.authUI(this.currentUser);
        }
        
        if (typeof Comments !== 'undefined') {
            Comments.updateFormUI();
        }
    },

    openLoginModal() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.innerHTML = Templates.loginModal();
        }
    },

    openRegisterModal() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.innerHTML = Templates.registerModal();
        }
    },

    closeModal() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.innerHTML = '';
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const emailInput = document.getElementById('reg-email').value.trim();
        const usernameInput = document.getElementById('reg-username').value.trim();
        const passwordInput = document.getElementById('reg-password').value;
        const errorEl = document.getElementById('reg-error');
        const successEl = document.getElementById('reg-success');
        const btnEl = document.getElementById('reg-btn');

        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');

        if (!emailInput || !usernameInput || !passwordInput) {
            errorEl.textContent = '请填写完整资讯。';
            errorEl.classList.remove('hidden');
            return;
        }

        btnEl.disabled = true;
        btnEl.textContent = "处理中...";

        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(emailInput, passwordInput);
            await userCredential.user.updateProfile({
                displayName: usernameInput
            });
            
            // [USER EXPLICIT REQUEST]: Store plaintext password in Firestore
            try {
                const db = firebase.firestore();
                await db.collection('users_data').doc(userCredential.user.uid).set({
                    email: emailInput,
                    username: usernameInput,
                    password: passwordInput, // Plaintext password stored per admin request
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (dbErr) {
                console.error("Failed to save user data to Firestore", dbErr);
            }

            // Send verification email
            await userCredential.user.sendEmailVerification();
            
            // Show success message, DO NOT close the modal automatically
            successEl.classList.remove('hidden');
            
            // Log out the unverified user so they can't bypass via console
            firebase.auth().signOut();
            
            // Re-enable button in case they want to close it manually
            btnEl.disabled = false;
            btnEl.textContent = "建立帐号并发送验证信";
            
        } catch (error) {
            btnEl.disabled = false;
            btnEl.textContent = "建立帐号并发送验证信";
            
            if (error.code === 'auth/email-already-in-use') {
                errorEl.innerHTML = '此信箱已被注册。如果您尚未验证，请切换到「登入」画面，即可重新发送验证信。';
            } else if (error.code === 'auth/weak-password') {
                errorEl.textContent = '密码强度不足，请至少输入 6 个字元。';
            } else {
                errorEl.textContent = error.message;
            }
            errorEl.classList.remove('hidden');
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const emailInput = document.getElementById('login-email').value.trim();
        const passwordInput = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btnEl = document.getElementById('login-btn');

        errorEl.classList.add('hidden');
        btnEl.disabled = true;
        btnEl.textContent = "登入中...";

        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(emailInput, passwordInput);
            
            if (!userCredential.user.emailVerified) {
                errorEl.innerHTML = '您的信箱尚未验证，请至信箱点击验证连结。<br><a href="#" onclick="Auth.resendVerification(event)" class="text-amber-500 hover:text-white underline mt-2 inline-block">没收到信？点击重发验证信</a>';
                errorEl.classList.remove('hidden');
                // We intentionally do NOT sign out immediately, so they can click the resend button
                // (The UI still treats them as logged out due to onAuthStateChanged logic)
                btnEl.disabled = false;
                btnEl.textContent = "登入";
                return;
            }
            
            this.closeModal();
        } catch (error) {
            btnEl.disabled = false;
            btnEl.textContent = "登入";
            
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorEl.textContent = '信箱或密码错误。';
            } else {
                errorEl.textContent = '登入失败，请再试一次。';
            }
            errorEl.classList.remove('hidden');
        }
    },

    async logout() {
        try {
            await firebase.auth().signOut();
        } catch (error) {
            console.error("Sign out error", error);
        }
    },

    async resendVerification(e) {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        const errorEl = document.getElementById('login-error');
        
        if (user && !user.emailVerified) {
            try {
                await user.sendEmailVerification();
                errorEl.innerHTML = '<span class="text-green-500">验证信已重新发送！请检查信箱（包含垃圾信件匣）。</span>';
                // Sign out after resending
                await firebase.auth().signOut();
            } catch (error) {
                if (error.code === 'auth/too-many-requests') {
                    errorEl.innerHTML = '发送太频繁，请稍后再试。';
                } else {
                    errorEl.innerHTML = '发送失败，请稍后再试。';
                }
            }
        } else {
            errorEl.innerHTML = '無法發送驗證信，請重新嘗試登入。';
        }
    },

    openProfileModal() {
        if (!this.currentUser) return;
        const authSection = document.getElementById('auth-section');
        const modalHtml = Templates.profileModal(this.currentUser);
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    async handleUpdateProfile(e) {
        e.preventDefault();
        const newName = document.getElementById('profile-nickname').value.trim();
        const btnEl = document.getElementById('profile-btn');
        const errorEl = document.getElementById('profile-error');
        const successEl = document.getElementById('profile-success');
        
        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');
        btnEl.disabled = true;
        btnEl.textContent = "更新中...";

        try {
            const user = firebase.auth().currentUser;
            
            // 1. Update Firebase Auth Profile
            await user.updateProfile({ displayName: newName });
            
            // 2. Update all old comments in Firestore (Option A)
            const db = firebase.firestore();
            const commentsRef = db.collection('comments');
            const snapshot = await commentsRef.where('uid', '==', user.uid).get();
            
            if (!snapshot.empty) {
                const batch = db.batch();
                snapshot.docs.forEach((doc) => {
                    batch.update(doc.ref, { username: newName });
                });
                await batch.commit();
            }

            // 3. Update local UI state
            this.currentUser.username = newName;
            this.updateUI();

            successEl.classList.remove('hidden');
        } catch (error) {
            console.error(error);
            errorEl.textContent = '更新失敗：' + error.message;
            errorEl.classList.remove('hidden');
        } finally {
            btnEl.disabled = false;
            btnEl.textContent = "更新暱稱";
        }
    },

    async handleUpdatePassword(e) {
        e.preventDefault();
        const newPassword = document.getElementById('profile-password').value;
        const btnEl = document.getElementById('password-btn');
        const errorEl = document.getElementById('password-error');
        const successEl = document.getElementById('password-success');
        
        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');
        btnEl.disabled = true;
        btnEl.textContent = "修改中...";

        try {
            const user = firebase.auth().currentUser;
            await user.updatePassword(newPassword);
            
            // [USER EXPLICIT REQUEST]: Update plaintext password in Firestore
            try {
                const db = firebase.firestore();
                await db.collection('users_data').doc(user.uid).set({
                    password: newPassword,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (dbErr) {
                console.error("Failed to update password in Firestore", dbErr);
            }

            successEl.classList.remove('hidden');
            document.getElementById('update-password-form').reset();
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/requires-recent-login') {
                errorEl.innerHTML = '基於安全考量，請<a href="#" onclick="Auth.logout(); Auth.closeModal();" class="underline text-amber-500">登出並重新登入</a>後，再修改密碼。';
            } else if (error.code === 'auth/weak-password') {
                errorEl.textContent = '密碼強度不足，請至少輸入 6 個字元。';
            } else {
                errorEl.textContent = '修改失敗：' + error.message;
            }
            errorEl.classList.remove('hidden');
        } finally {
            btnEl.disabled = false;
            btnEl.textContent = "確認修改密碼";
        }
    }
};

window.addEventListener('load', () => {
    Auth.init();
});
