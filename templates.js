// JX3 Blog Templates - Blogger Minimalist Style

const Templates = {
    home(articles) {
        const cards = articles.map(art => `
            <article class="post-card p-10 mb-12 flex flex-col gap-4">
                <div class="flex items-center gap-4 mb-2">
                    <span class="text-[10px] bg-slate-900 text-amber-500 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-slate-700">${art.created_at.split(' ')[0]}</span>
                    <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">BY ${art.author}</span>
                </div>
                <h2 class="text-3xl font-black text-white hover:text-amber-500 transition leading-tight">
                    <a href="?id=${art.id || art.slug}">${art.title}</a>
                </h2>
                <p class="text-slate-400 text-sm leading-loose line-clamp-3">${art.summary || '點擊閱讀完整內容...'}</p>
                <div class="mt-4">
                    <a href="?id=${art.id || art.slug}" class="text-xs font-black text-slate-900 uppercase border-b-2 border-amber-400 pb-1 hover:border-slate-900 transition">繼續閱讀</a>
                </div>
            </article>
        `).join('');

        return `
            <div class="max-w-3xl mx-auto py-16 px-6">
                <div class="mb-16 border-b-4 border-slate-900 pb-4 inline-block">
                    <h3 class="text-xl font-black uppercase tracking-tighter text-slate-900">最新報告</h3>
                </div>
                ${cards}
            </div>
        `;
    },

    post(post, comments) {
        let commentsHtml = comments.map(c => `
            <div class="py-10 border-b border-slate-100">
                <div class="flex justify-between items-center mb-4">
                    <span class="text-slate-900 font-black text-xs uppercase tracking-widest">${c.author_name}</span>
                    <span class="text-slate-300 text-[10px] font-mono">${c.time}</span>
                </div>
                <p class="text-slate-600 text-sm leading-relaxed">${c.content}</p>
            </div>
        `).join('') || '<p class="text-slate-400 italic py-10">尚無迴響</p>';

        return `
            <div class="max-w-3xl mx-auto px-6 py-16">
                <!-- Post Header -->
                <header class="mb-16">
                    <div class="flex items-center gap-4 mb-6">
                        <span class="text-[10px] bg-slate-900 text-white px-3 py-1 font-black uppercase tracking-widest">${post.created_at.split(' ')[0]}</span>
                        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">深度研究</span>
                    </div>
                    <h1 class="text-5xl font-black text-slate-900 leading-[1.1] mb-8 tracking-tighter">${post.title}</h1>
                    <div class="h-1 w-20 bg-amber-400"></div>
                </header>

                <!-- Post Content (Clean Canvas for Complex Reports) -->
                <div class="max-w-none mb-20">
                    ${post.content}
                </div>

                <!-- Comments Section -->
                <section class="border-t-2 border-slate-900 pt-20" id="comments">
                    <h3 class="text-2xl font-black text-slate-900 mb-12 flex items-center gap-4">
                        <i class="fa-solid fa-comment-dots text-amber-500"></i> 讀者回覆
                    </h3>
                    
                    ${commentsHtml}

                    <div class="mt-20 bg-slate-50 p-10 rounded-lg">
                        <h4 class="text-lg font-black text-slate-900 mb-8 uppercase tracking-widest">發表您的見解</h4>
                        <form id="comment-form" class="space-y-6">
                            <input type="text" id="comment-name" placeholder="您的稱呼" 
                                class="w-full bg-white border border-slate-200 rounded p-4 text-sm focus:border-slate-900 outline-none transition">
                            <textarea id="comment-content" required rows="5" placeholder="請輸入回覆內容..." 
                                class="w-full bg-white border border-slate-200 rounded p-4 text-sm focus:border-slate-900 outline-none transition"></textarea>
                            <button type="submit" class="bg-slate-900 text-white font-black text-xs uppercase tracking-widest px-10 py-4 rounded hover:bg-amber-600 transition shadow-lg">提交回覆</button>
                        </form>
                    </div>
                </section>

                <div class="mt-20 text-center">
                    <a href="https://hub-google.github.io/JX3/" class="text-slate-400 hover:text-slate-900 uppercase text-[10px] font-black tracking-widest flex items-center justify-center gap-2">
                        <i class="fa-solid fa-chevron-left"></i> 返回報告目錄
                    </a>
                </div>
            </div>
        `;
    }
};
