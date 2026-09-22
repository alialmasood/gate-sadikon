# تقرير مخطط قاعدة البيانات — منصة بوابة صادقون

| البند | التفاصيل |
|--------|----------|
| **المنصة** | بوابة صادقون (Gate Sadikon) |
| **نظام إدارة قواعد البيانات** | PostgreSQL 16 |
| **طبقة الوصول (ORM)** | Prisma |
| **إصدار التقرير** | 1.0 |
| **تاريخ الإصدار** | 2026-09-19 |
| **الغرض** | توثيق الجداول والعلاقات لدعم تكامل/ترحيل بيانات مع تطبيق خارجي |

---

## 1. ملخص تنفيذي

تُدار بيانات المنصة عبر قاعدة PostgreSQL واحدة، مُعرَّفة بالكامل في ملف Prisma Schema. النموذج مبني حول **المعاملات الإدارية** المرتبطة بـ **المكاتب** و**المواطنين** و**المخولين** و**التشكيلات**، مع طبقة مستخدمين وصلاحيات، ونظام تقييم، وشكاوى، وخيارات نماذج قابلة للإدارة.

هذا المستند يصف **هيكل البيانات فقط** (الجداول، الحقول، المفاتيح، العلاقات، والقيم المرجعية). لا يتضمن بيانات حقيقية، ولا بيانات اعتماد للاتصال، ولا إجراءات تشغيل على بيئة الإنتاج.

---

## 2. نظرة عامة على الكيانات

| # | الجدول | الوصف الوظيفي |
|---|--------|----------------|
| 1 | `User` | حسابات المستخدمين وصلاحياتهم |
| 2 | `Office` | المكاتب الإدارية |
| 3 | `Delegate` | المخولون بمعالجة المعاملات |
| 4 | `DelegateFormationAssignment` | ربط المخول بتشكيل/دائرة فرعية |
| 5 | `Formation` | التشكيلات (وزارات/جهات) |
| 6 | `FormationSubDept` | الدوائر الفرعية التابعة للتشكيل |
| 7 | `Transaction` | المعاملات (الكيان المركزي) |
| 8 | `Evaluation` | تقييمات شهرية (مكتب / مخول / مستخدم) |
| 9 | `Complaint` | الشكاوى (سرية / عامة) |
| 10 | `FormFieldOption` | خيارات قوائم النماذج (قابلة للإدارة) |

**إجمالي الجداول:** 10  
**أنواع التعداد (Enums):** 2 — `Role` ، `ComplaintType`

---

## 3. مخطط العلاقات (ملخص)

```
User ───────────────< Office (manager)
User >─────────────── Office (officeId)
User ───────────────< Transaction (createdByUserId)
User ───────────────< Evaluation (evaluatedById)

Office ─────────────< Transaction
Office ─────────────< User

Delegate ───────────< Transaction
Delegate ───────────< DelegateFormationAssignment
Formation ──────────< DelegateFormationAssignment
FormationSubDept ───< DelegateFormationAssignment

Formation ──────────< FormationSubDept
Formation ──────────< Transaction
```

الكيان المركزي للتكامل مع واجهات التطبيق الخارجي عادةً هو **`Transaction`**، مع كيانات مرجعية: `Office`, `Delegate`, `Formation`, `FormationSubDept`, وبيانات المواطن المضمّنة داخل المعاملة.

---

## 4. تفاصيل الجداول

### 4.1 `User` — المستخدمون

| الحقل | النوع | قيود | الوصف |
|-------|------|------|--------|
| `id` | String (cuid) | PK | المعرّف |
| `email` | String | UNIQUE, NOT NULL | البريد الإلكتروني لتسجيل الدخول |
| `password` | String | NOT NULL | كلمة المرور (مخزّنة بشكل مشفّر/مُجزّأ حسب آلية المنصة) |
| `name` | String? | — | الاسم |
| `phone` | String? | — | الهاتف |
| `address` | String? | — | العنوان |
| `avatarUrl` | String? | — | رابط الصورة الشخصية |
| `ministry` | String? | — | الوزارة |
| `department` | String? | — | الدائرة |
| `assignmentDate` | DateTime? | — | تاريخ التكليف |
| `serialNumber` | String? | UNIQUE | الرقم التسلسلي للمستخدم |
| `role` | Role | DEFAULT `USER` | الدور/الصلاحية |
| `enabled` | Boolean | DEFAULT `true` | تفعيل الحساب |
| `officeId` | String? | FK → Office | المكتب المرتبط |
| `createdAt` | DateTime | DEFAULT now() | تاريخ الإنشاء |
| `updatedAt` | DateTime | @updatedAt | آخر تحديث |

**علاقات صادرة:**
- `office` → Office (اختياري، `onDelete: SetNull`)
- `managedOffices` → Office[] (كمدير مكتب)
- `evaluationsAsEvaluator` → Evaluation[]
- `createdTransactions` → Transaction[]

---

### 4.2 `Office` — المكاتب

| الحقل | النوع | قيود | الوصف |
|-------|------|------|--------|
| `id` | String (cuid) | PK | المعرّف |
| `name` | String | NOT NULL | اسم المكتب |
| `type` | String? | — | نوع المكتب |
| `location` | String? | — | الموقع |
| `status` | String | DEFAULT `ACTIVE` | الحالة: `ACTIVE` / `INACTIVE` |
| `managerId` | String? | FK → User | مدير المكتب |
| `managerName` | String? | — | اسم المدير (نصي) |
| `managerPhone` | String? | — | هاتف المدير |
| `managerAvatarUrl` | String? | — | صورة المدير |
| `assignmentDate` | DateTime? | — | تاريخ التكليف |
| `createdAt` / `updatedAt` | DateTime | — | الطوابع الزمنية |

**علاقات:** `manager` → User ، `users` → User[] ، `transactions` → Transaction[]

---

### 4.3 `Delegate` — المخولون

| الحقل | النوع | قيود | الوصف |
|-------|------|------|--------|
| `id` | String (cuid) | PK | المعرّف |
| `name` | String? | — | الاسم |
| `userId` | String? | — | ربط اختياري بحساب مستخدم (بدون FK رسمي في المخطط) |
| `officeId` | String? | — | المكتب (بدون FK رسمي في المخطط) |
| `formationIds` | Json? | — | مصفوفة معرّفات تشكيلات مرتبطة (إرث/تكميلي) |
| `status` | String | DEFAULT `ACTIVE` | الحالة |
| `createdAt` / `updatedAt` | DateTime | — | الطوابع الزمنية |

**علاقات:** `transactions` ، `assignments` → DelegateFormationAssignment[]

> ملاحظة تكامل: الربط الرسمي مع التشكيلات يتم عبر جدول `DelegateFormationAssignment`. حقل `formationIds` قد يبقى للتوافق مع منطق سابق.

---

### 4.4 `DelegateFormationAssignment` — تكليفات المخول بالتشكيلات

| الحقل | النوع | قيود | الوصف |
|-------|------|------|--------|
| `id` | String (cuid) | PK | المعرّف |
| `delegateId` | String | FK → Delegate, Cascade | المخول |
| `formationId` | String | FK → Formation, Cascade | التشكيل |
| `subDeptId` | String? | FK → FormationSubDept, Cascade | الدائرة الفرعية (اختياري) |
| `createdAt` | DateTime | DEFAULT now() | تاريخ الإنشاء |

**قيد فريد:** `@@unique([delegateId, formationId, subDeptId])`

---

### 4.5 `Formation` — التشكيلات

| الحقل | النوع | قيود | الوصف |
|-------|------|------|--------|
| `id` | String (cuid) | PK | المعرّف |
| `type` | String | NOT NULL | نوع التشكيل |
| `name` | String | NOT NULL | الاسم |
| `status` | String | DEFAULT `ACTIVE` | الحالة |
| `createdAt` / `updatedAt` | DateTime | — | الطوابع الزمنية |

**علاقات:** `subDepartments` ، `transactions` ، `delegateAssignments`

---

### 4.6 `FormationSubDept` — الدوائر الفرعية

| الحقل | النوع | قيود | الوصف |
|-------|------|------|--------|
| `id` | String (cuid) | PK | المعرّف |
| `formationId` | String | FK → Formation, Cascade | التشكيل الأب |
| `name` | String | NOT NULL | اسم الدائرة الفرعية |
| `status` | String | DEFAULT `ACTIVE` | الحالة |
| `createdAt` / `updatedAt` | DateTime | — | الطوابع الزمنية |

---

### 4.7 `Transaction` — المعاملات (الكيان المركزي)

| الحقل | النوع | قيود | الوصف |
|-------|------|------|--------|
| `id` | String (cuid) | PK | المعرّف |
| `citizenId` | String? | — | معرّف المواطن (إدخال يدوي) |
| `citizenName` | String? | — | اسم المواطن |
| `citizenPhone` | String? | — | هاتف المواطن |
| `citizenAddress` | String? | — | عنوان المواطن |
| `citizenIsEmployee` | Boolean? | — | هل المواطن موظف؟ |
| `citizenEmployeeSector` | String? | — | القطاع: `GOVERNMENT` / `PRIVATE` / `MIXED` (أو قيم من FormFieldOption) |
| `citizenMinistry` | String? | — | وزارة المواطن |
| `citizenDepartment` | String? | — | دائرة المواطن |
| `citizenOrganization` | String? | — | الجهة/المنظمة |
| `officeId` | String | FK → Office, Cascade | المكتب (إلزامي) |
| `createdByUserId` | String? | FK → User, SetNull | منشئ المعاملة |
| `delegateId` | String? | FK → Delegate, SetNull | المخول المعيّن |
| `status` | String | DEFAULT `PENDING` | الحالة التشغيلية |
| `type` | String? | — | نوع عام |
| `transactionType` | String? | — | نوع المعاملة (من الخيارات) |
| `transactionTitle` | String? | — | عنوان المعاملة |
| `submissionDate` | DateTime? | — | تاريخ التقديم |
| `formationId` | String? | FK → Formation, SetNull | التشكيل |
| `subDeptId` | String? | — | الدائرة الفرعية (مرجع نصي/معرّف بدون FK رسمي) |
| `serialNumber` | String? | UNIQUE | الرقم التسلسلي للمعاملة |
| `attachments` | Json? | — | مرفقات المعاملة |
| `delegateActions` | Json? | — | إجراءات المخول: `[{ text, attachmentUrl?, attachmentName?, createdAt }]` |
| `completedAt` | DateTime? | — | تاريخ الإنجاز |
| `urgent` | Boolean | DEFAULT `false` | عاجلة |
| `cannotComplete` | Boolean | DEFAULT `false` | تعذّر الإنجاز |
| `cannotCompleteReason` | String? | — | سبب تعذّر الإنجاز |
| `reachedSorting` | Boolean | DEFAULT `false` | وصلت لقسم الفرز |
| `completedByAdmin` | Boolean | DEFAULT `false` | أُنجزت بواسطة الأدمن |
| `assignedFromSection` | String? | — | القسم الذي سلّم للمخول: `SORTING` / `ADMIN` / `COORDINATOR` / `RECEPTION` |
| `sourceSection` | String? | — | القسم المُرسِل: `RECEPTION` / `COORDINATOR` / `DOCUMENTATION` / `ADMIN` |
| `createdAt` / `updatedAt` | DateTime | — | الطوابع الزمنية |

**حالات المعاملة المستخدمة في المنصة:**

| القيمة | المعنى |
|--------|--------|
| `PENDING` | قيد التنفيذ |
| `DONE` | منجزة |
| `OVERDUE` | متأخرة / تحذير |

---

### 4.8 `Evaluation` — التقييمات الشهرية

| الحقل | النوع | قيود | الوصف |
|-------|------|------|--------|
| `id` | String (cuid) | PK | المعرّف |
| `entityType` | String | NOT NULL | `OFFICE` / `DELEGATE` / `USER` |
| `entityId` | String | NOT NULL | معرّف الكيان المُقيَّم |
| `period` | String | NOT NULL | الفترة بصيغة `YYYY-MM` |
| `rating` | Int? | — | تقييم يدوي 1–5 |
| `notes` | String? (Text) | — | ملاحظات |
| `evaluatedById` | String | FK → User, Cascade | المقيِّم |
| `evaluatedAt` | DateTime | DEFAULT now() | وقت التقييم |
| `createdAt` / `updatedAt` | DateTime | — | الطوابع الزمنية |

**قيد فريد:** `@@unique([entityType, entityId, period])` — تقييم واحد لكل كيان في كل شهر.

---

### 4.9 `Complaint` — الشكاوى

| الحقل | النوع | قيود | الوصف |
|-------|------|------|--------|
| `id` | String (cuid) | PK | المعرّف |
| `type` | ComplaintType | NOT NULL | `SECRET` / `PUBLIC` |
| `name` | String | NOT NULL | اسم مقدّم الشكوى |
| `address` | String? | — | العنوان |
| `phone` | String | NOT NULL | الهاتف |
| `details` | String (Text) | NOT NULL | تفاصيل الشكوى |
| `attachments` | Json? | — | مرفقات |
| `createdAt` / `updatedAt` | DateTime | — | الطوابع الزمنية |

---

### 4.10 `FormFieldOption` — خيارات حقول النماذج

| الحقل | النوع | قيود | الوصف |
|-------|------|------|--------|
| `id` | String (cuid) | PK | المعرّف |
| `fieldKey` | String | NOT NULL | مفتاح الحقل |
| `value` | String | NOT NULL | القيمة المخزّنة |
| `label` | String | NOT NULL | التسمية المعروضة |
| `sortOrder` | Int | DEFAULT `0` | ترتيب العرض |
| `enabled` | Boolean | DEFAULT `true` | مفعّل |
| `createdAt` / `updatedAt` | DateTime | — | الطوابع الزمنية |

**قيود:**
- `@@unique([fieldKey, value])`
- فهرس: `@@index([fieldKey, enabled, sortOrder])`

**مفاتيح الحقول المستخدمة حالياً:**
- `TRANSACTION_TYPE` — أنواع المعاملات
- `EMPLOYEE_SECTOR` — قطاع الموظف (غالباً: حكومي / خاص / مشترك)

---

## 5. التعدادات (Enums)

### 5.1 `Role`

| القيمة | الوصف |
|--------|--------|
| `SUPER_ADMIN` | مشرف أعلى |
| `ADMIN` | مدير مكتب |
| `USER` | مستخدم عادي |
| `AUDITOR` | مدقق |
| `COORDINATOR` | تنسيق ومتابعة |
| `RECEPTION` | استقبال واستعلامات |
| `SORTING` | قسم الفرز |
| `DOCUMENTATION` | قسم التوثيق |
| `PARLIAMENT_MEMBER` | عضو برلمان |
| `SUPERVISION` | حاسبات الإشراف والمراقبة |

### 5.2 `ComplaintType`

| القيمة | الوصف |
|--------|--------|
| `SECRET` | سرية |
| `PUBLIC` | عامة |

---

## 6. توصيات للتكامل / ترحيل البيانات

1. **ابدأ بالجداول المرجعية ثم المركزية:**  
   `Office` → `User` → `Formation` → `FormationSubDept` → `Delegate` → `DelegateFormationAssignment` → `Transaction` → `Evaluation` / `Complaint` / `FormFieldOption`.

2. **حافظ على المعرّفات (cuid) إن أمكن** لتسهيل المطابقة لاحقاً وتجنّب ازدواجية السجلات.

3. **لا ترحّل كلمات المرور كما هي إلى تطبيق آخر** دون اتفاق أمني صريح؛ يُفضَّل إعادة تعيين أو ربط عبر SSO/API.

4. **حقول JSON** (`attachments`, `delegateActions`, `formationIds`) تحتاج تعريفاً مشتركاً لبنية الكائنات قبل الترحيل.

5. **بعض الروابط منطقية وليست FK صارمة** (مثل `Delegate.userId` / `Delegate.officeId` / `Transaction.subDeptId`) — يجب التحقق منها في طبقة التطبيق أثناء الترحيل.

6. **آلية الترحيل الموصى بها:** تصدير لقطات (CSV/JSON) أو API قراءة فقط، وليس مشاركة اتصال مباشر بقاعدة الإنتاج.

---

## 7. ملاحظات أمنية وتشغيلية

| البند | التوصية |
|--------|----------|
| مشاركة هذا المستند | آمنة نسبياً (مخطط فقط) |
| مشاركة `DATABASE_URL` / كلمات المرور / نسخ كاملة من DB | **غير مسموح** دون اتفاق مكتوب وضوابط وصول |
| الوصول المباشر لقاعدة الإنتاج | غير مستحسن؛ استخدم بيئة staging أو تصدير مُفلتر |
| بيانات المواطنين والشكاوى السرية | بيانات حسّاسة — تتطلب موافقة وتقييد نطاق الحقول |
| تأثير مشاركة المخطط وحده على المنصة | **لا يوجد تأثير تشغيلي** على المنصة |

---

## 8. خاتمة

يوفر هذا التقرير وصفاً تقنياً كاملاً لهيكل قاعدة بيانات منصة **بوابة صادقون** بصيغته الحالية (PostgreSQL 16 + Prisma). يمكن اعتماده كمرجع تصميم لواجهة تطبيق خارجية وترحيل البيانات، على أن يتم الاتفاق لاحقاً على:

- نطاق الجداول المراد مزامنتها
- سياسة الخصوصية والحقول المستبعدة
- آلية النقل (API / تصدير دوري / ترحيل لمرة واحدة)
- بيئة الاختبار قبل أي اتصال ببيانات حقيقية

---

*مستند داخلي تقني — بوابة صادقون — للاستخدام من قبل فرق التطوير المعتمدة فقط.*
