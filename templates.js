// JX3 Blog Templates
const Templates = {
    home(articles) {
        let listHtml = articles.map(a => `
            <article class="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-amber-500 transition shadow-lg group">
                <div class="flex flex-col gap-2">
                    <span class="text-xs text-amber-500 font-mono">${a.created_at}</span>
                    <h2 class="text-2xl font-bold text-white group-hover:text-amber-400 transition cursor-pointer" onclick="location.search='?id=${a.id}'">${a.title}</h2>
                    <p class="text-slate-400 mt-2 line-clamp-3">${a.summary || '點擊閱讀全文...'}</p>
                    <div class="mt-4 flex items-center justify-between">
                        <span class="text-xs text-slate-500"><i class="fa-solid fa-user-pen mr-1"></i>${a.author}</span>
                        <a href="?id=${a.id}" class="text-amber-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                            閱讀全文 <i class="fa-solid fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </article>
        `).join('');

        return `
            <div class="max-w-4xl mx-auto px-4 py-12">
                <div class="mb-12 text-center">
                    <h1 class="text-4xl font-black text-white mb-4 tracking-tight">劍網3 運營隨筆</h1>
                    <p class="text-slate-400 max-w-xl mx-auto">深度觀察 2026 劍網3 玩家生態、運營策略與行業洞察。</p>
                </div>
                <div class="grid grid-cols-1 gap-8">
                    ${listHtml}
                </div>
            </div>
        `;
    },

    post(post, comments) {
        let commentsHtml = comments.map(c => `
            <div class="bg-slate-900/50 p-6 rounded-lg border border-slate-700 mb-4">
                <div class="flex justify-between items-center mb-3">
                    <span class="text-amber-500 font-bold text-sm"><i class="fa-solid fa-user-ninja mr-2"></i>${c.author_name}</span>
                    <span class="text-slate-500 text-[10px] font-mono">${c.time}</span>
                </div>
                <p class="text-slate-300 text-sm leading-relaxed">${c.content}</p>
            </div>
        `).join('') || '<p class="text-center text-slate-500 py-8">暫時沒有迴響，歡迎發表您的見解。</p>';

        return `
            <div class="max-w-4xl mx-auto px-4 py-12">
                <a href="/" class="text-slate-500 hover:text-amber-500 text-sm flex items-center gap-2 mb-8 transition">
                    <i class="fa-solid fa-arrow-left"></i> 返回列表
                </a>

                <article>
                    <header class="mb-10 text-center">
                        <h1 class="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">${post.title}</h1>
                        <div class="flex justify-center items-center gap-6 text-slate-500 text-sm">
                            <span><i class="fa-solid fa-calendar mr-2"></i>${post.created_at}</span>
                            <span><i class="fa-solid fa-user mr-2"></i>${post.author}</span>
                        </div>
                    </header>

                    <!-- Article Body -->
                    <div class="prose prose-invert prose-amber max-w-none text-slate-300 leading-relaxed text-lg">
                        ${post.content}
                    </div>
                </article>

                <hr class="border-slate-800 my-16">

                <!-- Comment Section -->
                <section id="comments-section" class="max-w-3xl mx-auto">
                    <h3 class="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                        <i class="fa-solid fa-comments text-amber-500"></i> 社群迴響 (${comments.length})
                    </h3>

                    <div class="mb-10">
                        <form id="comment-form" class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase mb-2">暱稱 (非必填)</label>
                                    <input type="text" id="comment-name" placeholder="江湖俠士" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-500 uppercase mb-2">留言內容</label>
                                <textarea id="comment-content" required placeholder="請輸入您的看法..." rows="4" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"></textarea>
                            </div>
                            <button type="submit" class="mt-6 w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-lg transition shadow-lg flex justify-center items-center">
                                提交留言
                            </button>
                        </form>
                    </div>

                    <div id="comments-list">
                        ${commentsHtml}
                    </div>
                </section>
            </div>
        `;
    }
};
