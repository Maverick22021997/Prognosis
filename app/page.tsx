import Header from "@/components/Header";
import CategoryTabs from "@/components/CategoryTabs";

export default function Home() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1F27] text-white">
        <div className="mx-auto max-w-7xl px-8 py-20">

          <h2 className="mb-6 text-6xl font-bold leading-tight">
            Платформа
            <br />
            коллективного
            <span className="block text-[#D4AF37]">
              прогнозирования
            </span>
          </h2>

          <p className="max-w-2xl text-xl leading-9 text-gray-400">
            Анализируйте события, делайте прогнозы, соревнуйтесь с другими
            участниками и зарабатывайте игровые баллы GP.
          </p>
          <CategoryTabs />
        </div>
        
      </main>
    </>
  );
}