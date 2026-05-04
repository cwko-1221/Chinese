import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";

export default async function Home() {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") || (host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https");
  
  const appUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000");

  const qr = await QRCode.toDataURL(`${appUrl}/login`, {
    margin: 1,
    width: 260,
    color: { dark: "#050505", light: "#ffffff" },
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#281d5f,#0b0d1b_55%,#070914)] px-5 py-10 text-slate-100">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl shadow-violet-950/40 backdrop-blur">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-rose-500 text-2xl font-black shadow-lg">
            NCS
          </div>
          <h1 className="text-3xl font-black">粵語繁中學習平台</h1>
          <p className="mt-3 text-sm text-slate-300">掃描 QR Code 或點擊按鈕進入系統</p>
          <div className="mx-auto mt-8 w-fit rounded-xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Login QR Code" className="h-64 w-64" />
          </div>
          <Link
            href="/login"
            className="mt-8 flex h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-400 to-violet-500 text-lg font-bold text-white shadow-lg shadow-violet-950/40 transition hover:scale-[1.01]"
          >
            前往登入頁面
          </Link>
        </div>
      </section>
    </main>
  );
}
