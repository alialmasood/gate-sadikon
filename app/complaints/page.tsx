import Link from "next/link";

export default function ComplaintsLandingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-4 py-10 sm:px-6">
      <h1 className="mb-3 text-center text-3xl font-bold text-[#1B1B1B]">تقديم شكوى</h1>
      <p className="mx-auto mb-8 max-w-2xl text-center text-[#5a5a5a]">
        اختر نوع الشكوى المناسب، ثم قم بتعبئة البيانات وإرسالها ليتم التعامل معها بأسرع وقت.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/complaints/secret"
          className="rounded-2xl border border-[#2f7a3f]/30 bg-[#f4fff6] p-6 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="mb-2 text-xl font-bold text-[#214f2c]">تقديم شكوى سرية</h2>
          <p className="text-sm leading-7 text-[#33513a]">
            يتم التعامل مع الشكوى بسرية عالية، وحفظ بياناتك بشكل محمي ومخصص للمتابعة الرسمية فقط.
          </p>
        </Link>

        <Link
          href="/complaints/public"
          className="rounded-2xl border border-[#b88a1a]/30 bg-[#fffaf0] p-6 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="mb-2 text-xl font-bold text-[#5A430F]">تقديم شكوى علنية</h2>
          <p className="text-sm leading-7 text-[#6f5a25]">
            يمكن مشاركة مضمون الشكوى مع الجهات المعنية لمعالجتها، مع الالتزام بخصوصية بيانات التواصل.
          </p>
        </Link>
      </div>
    </main>
  );
}
