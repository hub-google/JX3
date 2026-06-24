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
            
            // Send verification email
            await userCredential.user.sendEmailVerification();
            
            // Show success message, wait a bit, then close
            successEl.classList.remove('hidden');
            setTimeout(() => {
                this.closeModal();
                // Because email isn't verified yet, they are logged out automatically by our onAuthStateChanged logic
                firebase.auth().signOut();
            }, 3000);
            
        } catch (error) {
            btnEl.disabled = false;
            btnEl.textContent = "建立帐号并发送验证信";
            
            if (error.code === 'auth/email-already-in-use') {
                errorEl.textContent = '此信箱已被注册。';
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
                errorEl.textContent = '您的信箱尚未验证，请至信箱点击验证连结。';
                errorEl.classList.remove('hidden');
                await firebase.auth().signOut();
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
    }
};

window.addEventListener('load', () => {
    Auth.init();
});
