// JX3 Blog Templates - Blogger Minimalist Style

const Templates = {
    home(articles) {
        const cards = articles.map(art => `
            <article class="post-card p-8 mb-8 flex flex-col gap-4">
                <div class="flex items-center gap-4 mb-1">
                    <span class="text-[10px] bg-slate-900 text-amber-500 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-slate-700">${art.created_at.split(' ')[0]}</span>
                </div>
                <h2 class="text-2xl font-black text-white hover:text-amber-500 transition leading-tight">
                    <a href="?id=${art.slug || art.id}">${art.title}</a>
                </h2>
                <p class="text-slate-400 text-sm leading-relaxed line-clamp-2">${art.summary || '点击阅读完整内容...'}</p>
                <div class="mt-2">
                    <a href="?id=${art.slug || art.id}" class="text-xs font-black text-white uppercase border-b-2 border-amber-500/30 pb-1 hover:border-amber-500 transition">继续阅读 READ MORE</a>
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
                <button onclick="Auth.openProfileModal()" class="text-xs font-bold text-slate-400 hover:text-white transition"><i class="fa-solid fa-gear"></i> 設定</button>
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
                        <div id="reg-success" class="text-green-500 text-xs mb-4 hidden">注册成功！验证信已发送至您的信箱。<br><span class="text-amber-500 font-bold">请务必检查「垃圾信件匣」或「促销内容」</span>，并点击连结完成验证。</div>
                        <button type="submit" id="reg-btn" class="w-full bg-slate-700 text-white font-bold py-3 rounded hover:bg-slate-600 transition">建立帐号并发送验证信</button>
                    </form>
                    <div class="mt-4 text-center text-sm text-slate-400">
                        已经有帐号？ <button onclick="Auth.openLoginModal()" class="text-amber-500 hover:text-white transition">登入</button>
                    </div>
                </div>
            </div>
        `;
    },

    profileModal(user) {
        return `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]" id="auth-modal-overlay">
                <div class="bg-slate-900 border border-slate-800 p-8 rounded-lg w-full max-w-md mx-4 relative max-h-[90vh] overflow-y-auto">
                    <button onclick="Auth.closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-times"></i></button>
                    <h2 class="text-2xl font-black text-white mb-6">帐号设定 SETTINGS</h2>
                    
                    <!-- Update Nickname -->
                    <form id="update-profile-form" onsubmit="Auth.handleUpdateProfile(event)" class="mb-8 border-b border-slate-800 pb-6">
                        <h3 class="text-sm font-bold text-amber-500 mb-4 uppercase tracking-widest">修改留言暱称</h3>
                        <div class="mb-4">
                            <label class="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest">目前暱称</label>
                            <input type="text" id="profile-nickname" value="${user.username}" class="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2 rounded focus:outline-none focus:border-amber-500" required minlength="2">
                        </div>
                        <div id="profile-success" class="text-green-500 text-xs mb-4 hidden">暱称更新成功！旧留言也会一并更新。</div>
                        <div id="profile-error" class="text-red-500 text-xs mb-4 hidden"></div>
                        <button type="submit" id="profile-btn" class="w-full bg-slate-700 text-white font-bold py-2 rounded hover:bg-slate-600 transition">更新暱称</button>
                    </form>

                    <!-- Update Password -->
                    <form id="update-password-form" onsubmit="Auth.handleUpdatePassword(event)">
                        <h3 class="text-sm font-bold text-amber-500 mb-4 uppercase tracking-widest">修改密码</h3>
                        <div class="mb-4">
                            <label class="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest">新密码 New Password</label>
                            <input type="password" id="profile-password" class="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2 rounded focus:outline-none focus:border-amber-500" required minlength="6">
                        </div>
                        <div id="password-success" class="text-green-500 text-xs mb-4 hidden">密码更新成功！</div>
                        <div id="password-error" class="text-red-500 text-xs mb-4 hidden"></div>
                        <button type="submit" id="password-btn" class="w-full border border-red-500/50 text-red-400 font-bold py-2 rounded hover:bg-red-500/10 transition">确认修改密码</button>
                    </form>
                </div>
            </div>
        `;
    },

    commentForm() {
        const isAdmin = Comments.isAdmin();
        return `
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-lg mb-8">
                <form onsubmit="Comments.submitComment(event)">
                    <textarea id="comment-input" rows="3" class="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded focus:outline-none focus:border-amber-500 mb-3" placeholder="写下你的想法..." required></textarea>
                    <div class="flex justify-between items-center flex-wrap gap-3">
                        <span class="text-xs text-slate-500">以 <span class="text-amber-500 font-bold" id="comment-username-display"></span> 的身份留言</span>
                        <div class="flex items-center gap-3">
                            ${isAdmin ? `<label class="flex items-center gap-1.5 text-xs text-amber-500 select-none mr-2 font-bold cursor-pointer"><input type="checkbox" id="comment-as-admin" class="accent-amber-500"> 以站長身分回覆</label>` : ''}
                            <button type="submit" class="bg-amber-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-amber-500 transition">送出留言</button>
                        </div>
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

    commentItem(c, depth) {
        const indent = Math.min(depth, 4) * 24;
        const isWebmaster = c.isAdminReply === true;
        const borderClass = isWebmaster ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-800/50';
        const badge = isWebmaster ? '<span class="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded font-black ml-2">站長</span>' : '';
        const nameColor = isWebmaster ? 'text-amber-400 font-black' : 'text-slate-300 font-bold';
        
        const date = new Date(c.timestamp);
        let timeFormatted = '';
        if (!isNaN(date.getTime())) {
            const pad = (n) => String(n).padStart(2, '0');
            timeFormatted = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        } else {
            timeFormatted = c.timestamp;
        }

        return `
            <div class="py-4 border border-x-0 border-t-0 ${borderClass} px-3 mb-2 transition" style="margin-left: ${indent}px; border-left-width: ${depth > 0 ? '2px' : '0px'}; border-left-color: ${isWebmaster ? '#fbbf24' : '#334155'};">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full ${isWebmaster ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-500'} flex items-center justify-center font-bold text-sm border ${isWebmaster ? 'border-amber-400' : 'border-slate-700'}">
                            ${isWebmaster ? '站' : c.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="text-sm flex items-center">
                                <span class="${nameColor}">${isWebmaster ? '站長' : c.username}</span>
                                ${badge}
                            </div>
                            <div class="text-slate-500 text-[10px] flex flex-wrap gap-x-2 gap-y-0.5">
                                <span>${timeFormatted}</span>
                                ${c.ip ? `<span>• IP: ${c.ip}${c.location ? ` (${c.location})` : ''}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <span class="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded font-mono">${c.floorPath || '1'} 樓</span>
                </div>
                <div class="text-slate-300 text-sm leading-relaxed pl-11 pr-4">
                    ${c.content.replace(/\n/g, '<br>')}
                </div>
                <div class="pl-11 mt-3 flex items-center gap-4">
                    <button onclick="Comments.showReplyForm('${c.id}')" class="text-[11px] text-slate-500 hover:text-amber-500 transition flex items-center gap-1 font-bold">
                        <i class="fa-solid fa-reply"></i> 回覆
                    </button>
                </div>
                <div id="reply-form-${c.id}" class="mt-3 pl-11 hidden">
                    <!-- Inline reply form injected here -->
                </div>
            </div>
        `;
    }
};
