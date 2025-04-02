import Link from "next/link";

export default function CollectionPage() {
  // Mock data for inscribed ordinals - this would come from your API/database
  const ordinals = Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    number: `#${(i + 1).toString().padStart(3, "0")}`,
    // Generate different gradients for variety
    image: `linear-gradient(to bottom right, ${getRandomColor()}, ${getRandomColor()})`,
  }));

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col items-center py-12 px-4 bg-gradient-to-b from-white to-gray-100">
        <div className="max-w-6xl w-full mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Collection Gallery</h2>
            <Link
              href="/"
              className="px-6 py-2 bg-blue-400 border-4 border-black font-bold hover:bg-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0)]"
            >
              Back to Mint
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {ordinals.map((ordinal) => (
              <div
                key={ordinal.id}
                className="border-4 border-black aspect-square shadow-[5px_5px_0px_0px_rgba(0,0,0)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0)] transition-all duration-200"
                style={{ background: ordinal.image }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-bold text-white text-lg">
                    {ordinal.number}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper function to generate random colors for the gradients
function getRandomColor() {
  const colors = [
    "#3b82f6",
    "#1e3a8a", // blues
    "#10b981",
    "#064e3b", // greens
    "#f59e0b",
    "#92400e", // oranges
    "#ef4444",
    "#7f1d1d", // reds
    "#8b5cf6",
    "#4c1d95", // purples
    "#ec4899",
    "#831843", // pinks
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
