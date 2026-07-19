export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#20262F]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">

        {/* Логотип */}

        <div className="flex items-center gap-4">

          <div className="h-4 w-4 rounded-full bg-[#D4AF37]" />

          <div>

            <h1 className="text-2xl font-bold tracking-[0.25em]">
              PROGNOSIS
            </h1>

            <p className="text-xs text-gray-400">
              Платформа коллективного прогнозирования
            </p>

          </div>

        </div>

        {/* Правая часть */}

        <div className="flex items-center gap-6">

          <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-2 text-sm font-semibold text-[#D4AF37]">
            GP 10 000
          </div>

          <button
            className="
              rounded-xl
              bg-[#D4AF37]
              px-5
              py-2.5
              font-semibold
              text-black
              transition
              duration-200
              hover:scale-105
              hover:bg-[#E6C65A]
            "
          >
            Войти
          </button>

        </div>

      </div>
    </header>
  );
}