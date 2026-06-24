// JX3 Blog Templates - Blogger Minimalist Style

const Templates = {
    home(articles) {
        const cards = articles.map(art => `
            <article class="post-card p-8 mb-8 flex flex-col gap-4">
                <div class="flex items-center gap-4 mb-1">
                    <span class="text-[10px] bg-slate-900 text-amber-500 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-slate-700">${art.created_at.split(' ')[0]}</span>
                </div>
                <h2 class="text-2xl font-black text-white hover:text-amber-500 transition leading-tight">
                    <a href="posts/${art.slug}.html">${art.title}</a>
                </h2>
                <p class="text-slate-400 text-sm leading-relaxed line-clamp-2">${art.summary || '点击阅读完整内容...'}</p>
                <div class="mt-2">
                    <a href="posts/${art.slug}.html" class="text-xs font-black text-white uppercase border-b-2 border-amber-500/30 pb-1 hover:border-amber-500 transition">继续阅读 READ MORE</a>
                </div>
            </article>
        `).join('');

        return `
            <div class="max-w-3xl mx-auto py-16 px-6">
                ${cards}
            </div>
        `;
    },

    post(post) {
        return `
            <div class="max-w-6xl mx-auto py-16">
                <!-- Post Content (Clean Canvas for Complex Reports) -->
                <div id="post-body" class="max-w-none mb-20 min-h-[60vh]">
                    <div class="flex justify-center py-40">
                        <i class="fa-solid fa-spinner fa-spin text-5xl text-amber-500"></i>
                    </div>
                </div>

                <div class="mt-20 border-t border-slate-800 pt-10">
                    <h3 class="text-xl font-bold text-white mb-6">留言区 COMMENTS</h3>
                    <div id="comments-container">
                        <!-- Comments injected by comments.js -->
                        <div class="text-slate-400 text-sm py-4">载入留言中...</div>
                    </div>
                </div>

                <div class="mt-20 text-center px-6">
                    <a href="https://hub-google.github.io/JX3/" class="text-slate-500 hover:text-amber-500 uppercase text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition">
                        <i class="fa-solid fa-chevron-left"></i> 返回首页 BACK TO HOME
                    </a>
                </div>
            </div>
        `;
    },

    authUI(user) {
        if (user) {
            return `
                <span class="text-white text-sm">Hi, <span class="text-amber-500">${user.username}</span></span>
                <button onclick="Auth.logout()" class="text-xs font-bold text-slate-400 hover:text-white transition">登出</button>
            `;
        } else {
            return `
                <button onclick="Auth.openLoginModal()" class="text-xs font-bold text-white hover:text-amber-500 transition">登入</button>
                <button onclick="Auth.openRegisterModal()" class="text-xs font-bold bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-500 transition">注册</button>
            `;
        }
    },

    loginModal() {
        return `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]" id="auth-modal-overlay">
                <div class="bg-slate-900 border border-slate-800 p-8 rounded-lg w-full max-w-md mx-4 relative">
                    <button onclick="Auth.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-times"></i></button>
                    <h2 class="text-2xl font-black text-white mb-6">登入 LOGIN</h2>
                    <form id="login-form" onsubmit="Auth.handleLogin(event)">
                        <div class="mb-4">
                            <label class="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest">电子信箱 Email</label>
                            <input type="email" id="login-email" class="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2 rounded focus:outline-none focus:border-amber-500" required>
                        </div>
                        <div class="mb-6">
                            <label class="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest">密码 Password</label>
                            <input type="password" id="login-password" class="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2 rounded focus:outline-none focus:border-amber-500" required>
                        </div>
                        <div id="login-error" class="text-red-500 text-xs mb-4 hidden"></div>
                        <button type="submit" id="login-btn" class="w-full bg-amber-600 text-white font-bold py-3 rounded hover:bg-amber-500 transition">登入</button>
                    </form>
                    <div class="mt-4 text-center text-sm text-slate-400">
                        还没有帐号？ <button onclick="Auth.openRegisterModal()" class="text-amber-500 hover:text-white transition">立即注册</button>
                    </div>
                </div>
            </div>
        `;
    },

    registerModal() {
        return `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]" id="auth-modal-overlay">
                <div class="bg-slate-900 border border-slate-800 p-8 rounded-lg w-full max-w-md mx-4 relative">
                    <button onclick="Auth.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-times"></i></button>
                    <h2 class="text-2xl font-black text-white mb-6">注册 REGISTER</h2>
                    <form id="register-form" onsubmit="Auth.handleRegister(event)">
                        <div class="mb-4">
                            <label class="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest">电子信箱 Email</label>
                            <input type="email" id="reg-email" class="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2 rounded focus:outline-none focus:border-amber-500" required>
                        </div>
                        <div class="mb-4">
                            <label class="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest">留言暱称 Nickname</label>
                            <input type="text" id="reg-username" class="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2 rounded focus:outline-none focus:border-amber-500" required minlength="2" placeholder="用于留言显示">
                        </div>
                        <div class="mb-6">
                            <label class="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest">密码 Password</label>
                            <input type="password" id="reg-password" class="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2 rounded focus:outline-none focus:border-amber-500" required minlength="6">
                        </div>
                        <div id="reg-error" class="text-red-500 text-xs mb-4 hidden"></div>
                        <div id="reg-success" class="text-green-500 text-xs mb-4 hidden">注册成功！验证信已发送至您的信箱，请点击连结完成验证。</div>
                        <button type="submit" id="reg-btn" class="w-full bg-slate-700 text-white font-bold py-3 rounded hover:bg-slate-600 transition">建立帐号并发送验证信</button>
                    </form>
                    <div class="mt-4 text-center text-sm text-slate-400">
                        已经有帐号？ <button onclick="Auth.openLoginModal()" class="text-amber-500 hover:text-white transition">登入</button>
                    </div>
                </div>
            </div>
        `;
    },

    commentForm() {
        return `
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-lg mb-8">
                <form onsubmit="Comments.submitComment(event)">
                    <textarea id="comment-input" rows="3" class="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded focus:outline-none focus:border-amber-500 mb-3" placeholder="写下你的想法..." required></textarea>
                    <div class="flex justify-between items-center">
                        <span class="text-xs text-slate-500">以 <span class="text-amber-500 font-bold" id="comment-username-display"></span> 的身份留言</span>
                        <button type="submit" class="bg-amber-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-amber-500 transition">送出留言</button>
                    </div>
                </form>
            </div>
        `;
    },

    commentLoginPrompt() {
        return `
            <div class="bg-slate-900/50 border border-slate-800/50 p-6 rounded-lg mb-8 text-center border-dashed">
                <p class="text-slate-400 mb-3">登入后即可参与讨论</p>
                <button onclick="Auth.openLoginModal()" class="bg-slate-800 text-white px-6 py-2 rounded text-sm font-bold hover:bg-slate-700 transition">登入 / 注册</button>
            </div>
        `;
    },

    commentItem(comment) {
        return `
            <div class="border-b border-slate-800/50 py-4 last:border-0">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-amber-500 font-bold text-sm">
                        ${comment.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="text-white text-sm font-bold">${comment.username}</div>
                        <div class="text-slate-500 text-[10px]">${new Date(comment.timestamp).toLocaleString()}</div>
                    </div>
                </div>
                <div class="text-slate-300 text-sm leading-relaxed pl-11">
                    ${comment.content.replace(/\n/g, '<br>')}
                </div>
            </div>
        `;
    }
};
