// JX3 Blog Logic

const API_BASE = '/api';

const JX3Blog = {
    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');

        if (articleId) {
            this.renderPost(articleId);
        } else {
            this.renderHome();
        }
    },

    async renderHome() {
        const root = document.getElementById('root');
        if (!root) return;
        
        root.innerHTML = '<div class="flex justify-center py-20"><i class="fa-solid fa-spinner fa-spin text-4xl text-amber-500"></i></div>';

        try {
            const res = await fetch(`${API_BASE}/articles`);
            const articles = await res.json();
            
            if (articles.length === 0) {
                root.innerHTML = '<p class="text-center text-slate-500 py-20">目前還沒有文章，請管理員發布第一篇！</p>';
                return;
            }

            root.innerHTML = Templates.home(articles);
        } catch (e) {
            root.innerHTML = `<p class="text-center text-red-500 py-20">載入失敗：${e.message}</p>`;
        }
    },

    async renderPost(id) {
        const root = document.getElementById('root');
        if (!root) return;

        root.innerHTML = '<div class="flex justify-center py-20"><i class="fa-solid fa-spinner fa-spin text-4xl text-amber-500"></i></div>';

        try {
            const postRes = await fetch(`${API_BASE}/articles/${id}`);
            if (!postRes.ok) throw new Error("文章不存在");
            const post = await postRes.json();

            const commRes = await fetch(`${API_BASE}/articles/${post.id}/comments`);
            const comments = await commRes.json();

            root.innerHTML = Templates.post(post, comments);
            
            // Re-run any highlighting or scripts if needed
            this.setupCommentForm(post.id);
        } catch (e) {
            root.innerHTML = `<div class="max-w-2xl mx-auto py-20 text-center"><h2 class="text-2xl font-bold mb-4">404 NOT FOUND</h2><p class="text-slate-400 mb-8">${e.message}</p><a href="/" class="text-amber-500 underline">返回首頁</a></div>`;
        }
    },

    setupCommentForm(articleId) {
        const form = document.getElementById('comment-form');
        if (!form) return;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            const nameInput = document.getElementById('comment-name');
            const contentInput = document.getElementById('comment-content');

            const payload = {
                article_id: articleId,
                author_name: nameInput.value || '江湖俠士',
                content: contentInput.value
            };

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>發布中...';

            try {
                const res = await fetch(`${API_BASE}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    this.renderPost(articleId); // Refresh to show new comment
                } else {
                    alert('發布失敗，請稍後再試');
                }
            } catch (e) {
                alert('系統錯誤：' + e.message);
            } finally {
                btn.disabled = false;
                btn.innerText = '提交留言';
            }
        };
    }
};

window.onload = () => JX3Blog.init();
