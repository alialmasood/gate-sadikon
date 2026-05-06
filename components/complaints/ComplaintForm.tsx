"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";

type ComplaintKind = "SECRET" | "PUBLIC";

type Props = {
  type: ComplaintKind;
};

const IRAQI_PHONE_REGEX = /^(?:\+964|964|0)?7[3-9]\d{8}$/;

function validateIraqiPhone(value: string) {
  const sanitized = value.replace(/\s|-/g, "");
  return IRAQI_PHONE_REGEX.test(sanitized);
}

export default function ComplaintForm({ type }: Props) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const title = type === "SECRET" ? "تقديم شكوى سرية" : "تقديم شكوى علنية";
  const privacyNote = useMemo(
    () =>
      type === "SECRET"
        ? "خصوصية الشكوى السرية: يتم التعامل مع هذه الشكوى بسرية تامة، ولا يتم كشف بياناتك إلا للجهة المخوّلة قانونيًا بالمتابعة."
        : "خصوصية الشكوى العلنية: قد يتم مشاركة مضمون الشكوى مع الجهات ذات العلاقة بغرض المعالجة، مع الالتزام بحماية بيانات الاتصال وعدم استخدامها خارج نطاق المتابعة.",
    [type]
  );

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(event.target.files ?? []));
  };

  const resetForm = () => {
    setName("");
    setAddress("");
    setPhone("");
    setDetails("");
    setFiles([]);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("يرجى إدخال الاسم.");
      return;
    }
    if (!validateIraqiPhone(phone)) {
      setError("يرجى إدخال رقم هاتف عراقي صحيح.");
      return;
    }
    if (!details.trim()) {
      setError("يرجى إدخال تفاصيل الشكوى.");
      return;
    }

    setSubmitting(true);
    try {
      const attachmentUrls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: fd,
        });
        const uploadJson = (await uploadRes.json()) as { url?: string; error?: string };
        if (!uploadRes.ok || !uploadJson.url) {
          throw new Error(uploadJson.error || "فشل رفع أحد المرفقات.");
        }
        attachmentUrls.push(uploadJson.url);
      }

      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          details: details.trim(),
          attachments: attachmentUrls,
        }),
      });

      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error || "تعذر إرسال الشكوى.");

      setSuccess(
        "تم ارسال شكوتك بنجاح سيتم التعامل معها والتواصل معك"
      );
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1B1B1B]">{title}</h1>
        <Link
          href="/complaints"
          className="rounded-lg border border-[#b88a1a]/50 px-4 py-2 text-sm font-medium text-[#5A430F] transition hover:bg-[#fff6df]"
        >
          رجوع
        </Link>
      </div>

      <p className="mb-6 rounded-xl border border-[#2f7a3f]/30 bg-[#f4fff6] p-4 text-sm leading-7 text-[#214f2c]">
        {privacyNote}
      </p>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[#e6d9b2] bg-white p-5 shadow-sm">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-[#2b2b2b]">
            الاسم
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-[#d8d8d8] px-3 py-2 outline-none focus:border-[#b88a1a]"
          />
        </div>

        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium text-[#2b2b2b]">
            العنوان
          </label>
          <input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-xl border border-[#d8d8d8] px-3 py-2 outline-none focus:border-[#b88a1a]"
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-[#2b2b2b]">
            رقم الهاتف العراقي (مطلوب)
          </label>
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            inputMode="tel"
            placeholder="مثل: 07XXXXXXXXX أو +9647XXXXXXXXX"
            className="w-full rounded-xl border border-[#d8d8d8] px-3 py-2 outline-none focus:border-[#b88a1a]"
          />
        </div>

        <div>
          <label htmlFor="details" className="mb-1 block text-sm font-medium text-[#2b2b2b]">
            تفاصيل الشكوى
          </label>
          <textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            required
            rows={5}
            className="w-full rounded-xl border border-[#d8d8d8] px-3 py-2 outline-none focus:border-[#b88a1a]"
          />
        </div>

        <div>
          <label htmlFor="attachments" className="mb-1 block text-sm font-medium text-[#2b2b2b]">
            مرفقات أو صور إن وجدت (يمكن تحميل أكثر من مرفق)
          </label>
          <input
            id="attachments"
            type="file"
            onChange={onFileChange}
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="w-full rounded-xl border border-[#d8d8d8] px-3 py-2 file:ml-3 file:rounded-lg file:border-0 file:bg-[#fff6df] file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
        </div>

        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[#2f7a3f] px-4 py-3 font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "جاري إرسال الشكوى..." : "إرسال الشكوى"}
        </button>
      </form>
    </main>
  );
}
