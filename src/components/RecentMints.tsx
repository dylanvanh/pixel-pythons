import Link from "next/link";

export function RecentMints() {
  // Mock data for recently minted ordinals
  const recentMints = [
    { id: 1, number: "#123", image: "linear-gradient(to bottom right, #3b82f6, #1e3a8a)" },
    { id: 2, number: "#456", image: "linear-gradient(to bottom right, #10b981, #064e3b)" },
    { id: 3, number: "#789", image: "linear-gradient(to bottom right, #f59e0b, #92400e)" },
    { id: 4, number: "#101", image: "linear-gradient(to bottom right, #ef4444, #7f1d1d)" },
    { id: 5, number: "#202", image: "linear-gradient(to bottom right, #8b5cf6, #4c1d95)" },
  ];

  return (
    <div className="w-full mt-10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Recently Minted</h3>
        <Link
          href="/collection"
          className="text-sm font-bold underline underline-offset-4 hover:bg-blue-300 px-2 py-1"
        >
          View All
        </Link>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {recentMints.map((mint) => (
          <div 
            key={mint.id}
            className="border-4 border-black aspect-square shadow-[5px_5px_0px_0px_rgba(0,0,0)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0)] transition-all duration-200"
            style={{ background: mint.image }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-bold text-white text-lg">{mint.number}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 