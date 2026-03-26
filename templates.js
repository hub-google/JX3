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
                    <a href="?id=${art.id || art.slug}" class="text-xs font-black text-white uppercase border-b-2 border-amber-500/30 pb-1 hover:border-amber-500 transition">繼續閱讀 READ MORE</a>
                </div>
            </article>
        `).join('');

        return `
            <div class="max-w-3xl mx-auto py-16 px-6">
                <div class="mb-16 border-b-4 border-amber-500 pb-4 inline-block">
                    <h3 class="text-xl font-black uppercase tracking-tighter text-white">JX3 深度報告 LATEST REPORTS</h3>
                </div>
                ${cards}
            </div>
        `;
    },

    post(post) {
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
                <div id="post-body" class="max-w-none mb-20">
                    <div class="flex justify-center py-20">
                        <i class="fa-solid fa-spinner fa-spin text-3xl text-amber-500"></i>
                    </div>
                </div>

                <div class="mt-20 text-center">
                    <a href="https://hub-google.github.io/JX3/" class="text-slate-500 hover:text-amber-500 uppercase text-[10px] font-black tracking-widest flex items-center justify-center gap-2 transition">
                        <i class="fa-solid fa-chevron-left"></i> 返回首頁 BACK TO HOME
                    </a>
                </div>
            </div>
        `;
    }
};
