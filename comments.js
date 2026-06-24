// JX3 Blog - Firebase Firestore Comments

const Comments = {
    currentArticleId: null,
    unsubscribe: null,

    init(articleId) {
        this.currentArticleId = articleId;
        this.listenForComments();
    },

    listenForComments() {
        if (!this.currentArticleId) return;

        const db = firebase.firestore();
        const container = document.getElementById('comments-container');
        
        // Unsubscribe from previous listener if exists
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        // Setup the UI structure
        if (container) {
            let html = '<div id="comment-form-container"></div><div id="comment-list-container"></div>';
            container.innerHTML = html;
            this.updateFormUI();
        }

        const listContainer = document.getElementById('comment-list-container');
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="text-slate-400 text-sm py-4 text-center">载入留言中...</div>';

        // Listen to Firestore
        this.unsubscribe = db.collection('comments')
            .where('articleId', '==', this.currentArticleId)
            .onSnapshot((snapshot) => {
                const comments = [];
                snapshot.forEach((doc) => {
                    comments.push({ id: doc.id, ...doc.data() });
                });
                
                // Sort locally by timestamp to avoid Firestore composite index requirement
                comments.sort((a, b) => {
                    const timeA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime()) : 0;
                    const timeB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime()) : 0;
                    return timeA - timeB;
                });
                
                this.renderComments(comments);
            }, (error) => {
                console.error("Error fetching comments: ", error);
                // Provide a more detailed error message
                if (error.code === 'permission-denied') {
                    listContainer.innerHTML = '<div class="text-red-400 text-sm py-4 text-center border border-slate-800 border-dashed rounded-lg">Firebase 資料庫讀取權限不足，請至控制台修改 Rules。</div>';
                } else {
                    listContainer.innerHTML = '<div class="text-red-400 text-sm py-4 text-center border border-slate-800 border-dashed rounded-lg">Firebase 發生錯誤：' + error.message + '</div>';
                }
            });
    },

    renderComments(comments) {
        const listContainer = document.getElementById('comment-list-container');
        if (!listContainer) return;

        if (comments.length === 0) {
            listContainer.innerHTML = '<div class="text-slate-500 text-sm py-8 text-center border border-slate-800 border-dashed rounded-lg">暂无留言，抢先头香吧！</div>';
        } else {
            let html = '<div class="mt-4">';
            comments.forEach(c => {
                // Ensure date formatting works with Firebase Timestamp or ISO string
                const timeStr = c.timestamp && c.timestamp.toDate ? c.timestamp.toDate().toISOString() : c.timestamp;
                const commentData = {
                    ...c,
                    timestamp: timeStr || new Date().toISOString()
                };
                html += Templates.commentItem(commentData);
            });
            html += '</div>';
            listContainer.innerHTML = html;
        }
    },

    updateFormUI() {
        const formContainer = document.getElementById('comment-form-container');
        if (!formContainer) return;

        if (Auth.currentUser) {
            formContainer.innerHTML = Templates.commentForm();
            const usernameDisplay = document.getElementById('comment-username-display');
            if (usernameDisplay) {
                usernameDisplay.textContent = Auth.currentUser.username;
            }
        } else {
            formContainer.innerHTML = Templates.commentLoginPrompt();
        }
    },

    async submitComment(e) {
        e.preventDefault();
        if (!Auth.currentUser) {
            Auth.openLoginModal();
            return;
        }

        const inputEl = document.getElementById('comment-input');
        const content = inputEl.value.trim();
        
        if (!content || !this.currentArticleId) return;

        const db = firebase.firestore();
        
        try {
            await db.collection('comments').add({
                articleId: this.currentArticleId,
                username: Auth.currentUser.username,
                uid: Auth.currentUser.uid,
                content: content,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Clear input after successful submit
            inputEl.value = '';
            
        } catch (error) {
            console.error("Error adding comment: ", error);
            alert("留言失败，请确认 Firebase 設定是否正確，以及 Firestore 讀寫權限是否開放。");
        }
    }
};
