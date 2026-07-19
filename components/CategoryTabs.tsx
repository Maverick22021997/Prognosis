const categories = [
  "Все",
  "⚽ Спорт",
  "💰 Экономика",
  "📰 Новости",
  "🎬 Развлечения",
  "🌍 Мир",
];

export default function CategoryTabs() {
  return (
    <section className="mt-16">
      <div className="flex flex-wrap gap-4">

        {categories.map((category, index) => (

          <button
            key={category}
            className={`
              rounded-xl
              px-5
              py-3
              text-sm
              font-medium
              transition-all
              duration-200

              ${
                index === 0
                  ? "bg-gold text-black"
                  : "border border-white/10 bg-surface text-gray-300 hover:border-gold hover:text-gold"
              }
            `}
          >
            {category}
          </button>

        ))}

      </div>
    </section>
  );
}