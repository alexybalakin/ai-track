# AI-Track — MVP Implementation Plan

## Стек
- **Frontend + Backend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Стилизация**: Tailwind CSS v4 (минималистичный белый дизайн, синие акценты, скругления)
- **БД**: PostgreSQL + Prisma ORM
- **Аутентификация**: NextAuth.js (email + пароль)
- **Drag & Drop**: @dnd-kit/core
- **State Management**: React Query (TanStack Query) для серверного состояния
- **Уведомления**: React Hot Toast (in-app для MVP)

---

## Этапы реализации

### Этап 1 — Инициализация проекта
1. `create-next-app` с TypeScript, Tailwind, App Router
2. Установить зависимости: Prisma, NextAuth, dnd-kit, TanStack Query, bcrypt, react-hot-toast
3. Настроить структуру папок:
   ```
   src/
   ├── app/
   │   ├── (auth)/           # login, register
   │   ├── (dashboard)/      # основное приложение
   │   │   ├── boards/
   │   │   └── board/[id]/
   │   ├── api/
   │   │   ├── auth/
   │   │   ├── boards/
   │   │   ├── tasks/
   │   │   └── comments/
   │   ├── layout.tsx
   │   └── page.tsx
   ├── components/
   │   ├── ui/               # Button, Input, Modal, Card, Avatar...
   │   ├── board/            # KanbanBoard, Column, TaskCard
   │   ├── task/             # TaskModal, TaskForm, CommentList
   │   └── layout/           # Header, Sidebar
   ├── lib/
   │   ├── prisma.ts         # Prisma client singleton
   │   ├── auth.ts           # NextAuth config
   │   └── utils.ts
   ├── types/
   │   └── index.ts
   └── hooks/
       ├── useTasks.ts
       └── useBoards.ts
   ```
4. Инициализировать Prisma, подключить PostgreSQL

### Этап 2 — Модель данных (Prisma Schema)
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  passwordHash  String
  avatarUrl     String?
  timezone      String    @default("UTC")
  createdAt     DateTime  @default(now())

  ownedBoards   Board[]   @relation("BoardOwner")
  memberships   BoardMember[]
  tasks         Task[]    @relation("TaskAssignee")
  comments      Comment[]
}

model Board {
  id          String   @id @default(cuid())
  title       String
  description String?
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner       User     @relation("BoardOwner", fields: [ownerId], references: [id])
  members     BoardMember[]
  tasks       Task[]
}

model BoardMember {
  id      String @id @default(cuid())
  boardId String
  userId  String
  role    String @default("member") // "owner" | "member"

  board   Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([boardId, userId])
}

model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      String   @default("todo") // todo | in_progress_ai | review | done
  priority    String   @default("medium") // low | medium | high
  order       Int      @default(0)

  boardId     String
  assigneeId  String?

  // AI fields
  aiState     String   @default("idle") // idle | running | succeeded | failed
  aiResult    String?  @db.Text
  aiLog       String?  @db.Text

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  board       Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  assignee    User?    @relation("TaskAssignee", fields: [assigneeId], references: [id])
  comments    Comment[]
}

model Comment {
  id        String   @id @default(cuid())
  text      String   @db.Text
  taskId    String
  authorId  String
  createdAt DateTime @default(now())

  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id])
}
```

### Этап 3 — Аутентификация
1. NextAuth.js с Credentials Provider (email + пароль)
2. Страница регистрации `/register` — форма: имя, email, пароль
3. Страница логина `/login` — форма: email, пароль
4. Middleware для защиты роутов `/boards/*`, `/board/*`
5. Хеширование паролей через bcrypt

### Этап 4 — API Routes
1. **Boards**
   - `GET /api/boards` — список досок пользователя
   - `POST /api/boards` — создать доску
   - `GET /api/boards/[id]` — получить доску с задачами
   - `PUT /api/boards/[id]` — обновить доску
   - `DELETE /api/boards/[id]` — удалить доску
   - `POST /api/boards/[id]/members` — добавить участника

2. **Tasks**
   - `POST /api/tasks` — создать задачу
   - `PUT /api/tasks/[id]` — обновить задачу (включая смену статуса при drag & drop)
   - `DELETE /api/tasks/[id]` — удалить задачу
   - `PUT /api/tasks/[id]/status` — обновить статус (триггер AI при переходе в in_progress_ai)

3. **Comments**
   - `GET /api/tasks/[id]/comments` — комментарии задачи
   - `POST /api/tasks/[id]/comments` — добавить комментарий

### Этап 5 — UI компоненты (Канбан-доска)
1. **Базовые UI** — Button, Input, Modal, Card, Badge, Avatar (Tailwind, белый + синие акценты, rounded-xl)
2. **KanbanBoard** — 4 колонки с @dnd-kit
3. **Column** — заголовок + счётчик + список карточек
4. **TaskCard** — название, приоритет-бейдж, AI-статус индикатор, аватар исполнителя
5. **TaskModal** — side-panel при клике на карточку:
   - Полная информация о задаче
   - AI результат + лог
   - Список комментариев + форма добавления
6. **CreateTaskForm** — модалка создания задачи
7. **Header** — лого, навигация, профиль пользователя

### Этап 6 — Drag & Drop логика
1. При drop задачи в новую колонку → API вызов для обновления статуса
2. Оптимистичное обновление (instant UI feedback)
3. При переносе в "In Progress (AI)" → триггер AI-процесса
4. При переносе в "Review" из "In Progress (AI)" → только если AI succeeded
5. При переносе обратно из "Review" → статус снова in_progress_ai, можно добавить комментарий

### Этап 7 — AI-интеграция (заглушка для MVP)
1. При переходе задачи в `in_progress_ai`:
   - `aiState` → `running`
   - Запуск фонового процесса (имитация AI в MVP)
   - После завершения: `aiState` → `succeeded` или `failed`
   - `aiResult` заполняется результатом
   - Задача автоматически переносится в `review`
2. Уведомление пользователя о завершении (toast in-app)
3. В будущем: реальная AI интеграция (OpenAI API, Claude API)

### Этап 8 — Уведомления и отчёты
1. In-app toast уведомления:
   - "AI начал работу над задачей X"
   - "AI завершил задачу X — перенесена на Review"
   - "AI не смог завершить задачу X"
2. Мини-отчёт в TaskModal: что AI сделал, сколько попыток, результат

---

## Дизайн-система
- **Фон**: white (#FFFFFF), light gray (#F8FAFC) для карточек/колонок
- **Акцент**: blue-600 (#2563EB), blue-500 (#3B82F6)
- **Текст**: slate-900, slate-600, slate-400
- **Скругления**: rounded-xl (12px), rounded-2xl (16px) для карточек
- **Тени**: shadow-sm, shadow-md — мягкие
- **Шрифт**: Inter (через next/font)
- **AI-индикаторы**:
  - idle: серый
  - running: синий пульсирующий
  - succeeded: зелёный
  - failed: красный

---

## Порядок реализации (что делаем первым)
1. Инициализация проекта + Prisma schema + миграция
2. Аутентификация (register + login)
3. CRUD для досок
4. Канбан-доска с drag & drop
5. CRUD для задач + TaskModal
6. Комментарии
7. AI-заглушка + уведомления
8. Приглашение участников (базово)
