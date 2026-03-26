// JX3 Blog Templates - Blogger Minimalist Style

const Templates = {
    home(articles) {
        const cards = articles.map(art => `
            <article class="post-card p-10 mb-12 flex flex-col gap-4">
                <div class="flex items-center gap-4 mb-2">
                    <span class="text-[10px] bg-slate-900 text-amber-500 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-slate-700">${art.created_at.split(' ')[0]}</span>
                    <span class="text-[10px] text-slate-300 font-bold uppercase tracking-widest">BY ${art.author}</span>
                </div>
                <h2 class="text-3xl font-black text-white hover:text-amber-500 transition leading-tight line-clamp-2">
                    <a href="?id=${art.id || art.slug}">${art.title}</a>
                </h2>
                <p class="text-slate-400 text-sm leading-loose line-clamp-3">${art.summary || '點擊閱讀完整內容...'}</p>
                <div class="mt-4">
                    <a href="?id=${art.id || art.slug}" class="text-xs font-black text-amber-500 uppercase border-b-2 border-amber-500/30 pb-1 hover:border-amber-500 transition">繼續閱讀 READ MORE</a>
                </div>
            </article>
        `).join('');

        return `
            <div class="max-w-3xl mx-auto py-16 px-6">
                <div class="mb-16 border-b-4 border-amber-500 pb-4 inline-block">
                    <h3 class="text-xl font-black uppercase tracking-tighter text-white">最新報告 LATEST REPORTS</h3>
                </div>
                ${cards}
            </div>
        `;
    },

    post(post, comments) {
        let commentsHtml = comments.map(c => `
            <div class="py-10 border-b border-slate-800">
                <div class="flex justify-between items-center mb-4">
                    <span class="text-white font-black text-xs uppercase tracking-widest">${c.author_name}</span>
                    <span class="text-slate-500 text-[10px] font-mono">${c.time}</span>
                </div>
                <p class="text-slate-300 text-sm leading-relaxed">${c.content}</p>
            </div>
        `).join('') || '<p class="text-slate-500 italic py-10">尚無迴響 NO COMMENTS YET</p>';

        return `
            <div class="max-w-3xl mx-auto px-6 py-16">
                <!-- Post Header -->
                <header class="mb-16">
                    <div class="flex items-center gap-4 mb-6">
                        <span class="text-[10px] bg-slate-900 text-amber-500 px-3 py-1 font-black uppercase tracking-widest border border-slate-700">${post.created_at.split(' ')[0]}</span>
                        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">深度研究 RESEARCH</span>
                    </div>
                    <h1 class="text-4xl md:text-5xl font-black text-white leading-[1.1] mb-8 tracking-tighter">${post.title}</h1>
                    <div class="h-1 w-20 bg-amber-500"></div>
                </header>

                <!-- Post Content (Clean Canvas for Complex Reports) -->
                <div class="max-w-none mb-20">
                    ${post.content}
                </div>

                <!-- Comments Section -->
                <section class="border-t-2 border-slate-800 pt-20" id="comments">
                    <h3 class="text-2xl font-black text-white mb-12 flex items-center gap-4">
                        <i class="fa-solid fa-comment-dots text-amber-500"></i> 讀者回覆 COMMENTS
                    </h3>
                    
                    ${commentsHtml}

                    <div class="mt-20 bg-slate-900/50 p-10 rounded-lg border border-slate-800">
                        <h4 class="text-lg font-black text-white mb-8 uppercase tracking-widest">發表您的見解 LEAVE A COMMENT</h4>
                        <form id="comment-form" class="space-y-6">
                            <input type="text" id="comment-name" placeholder="您的稱呼 Name" 
                                class="w-full bg-slate-800 border border-slate-700 rounded p-4 text-sm text-white focus:border-amber-500 outline-none transition">
                            <textarea id="comment-content" required rows="5" placeholder="請輸入回覆內容 Comment..." 
                                class="w-full bg-slate-800 border border-slate-700 rounded p-4 text-sm text-white focus:border-amber-500 outline-none transition"></textarea>
                            <button type="submit" class="bg-amber-600 text-white font-black text-xs uppercase tracking-widest px-10 py-4 rounded hover:bg-amber-500 transition shadow-lg">提交回覆 SUBMIT</button>
                        </form>
                    </div>
                </section>

                <div class="mt-20 text-center">
                    <a href="https://hub-google.github.io/JX3/" class="text-slate-500 hover:text-amber-500 uppercase text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition">
                        <i class="fa-solid fa-chevron-left"></i> 返回報告目錄 BACK TO INDEX
                    </a>
                </div>
            </div>
        `;
    }
};
