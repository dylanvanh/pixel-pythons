export function Footer() {
  return (
    <footer className="w-full bg-blue-400 border-t-4 border-black p-4 mt-auto">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm font-bold">
            © {new Date().getFullYear()} Placeholder. All rights reserved.
          </p>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-bold px-3 py-1 bg-black text-white border-2 border-black hover:bg-blue-600 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0)]"
          >
            GitHub
          </a>
        </div>
        
        <div className="w-full max-w-4xl mx-auto bg-white border-2 border-black p-2 text-center shadow-[2px_2px_0px_0px_rgba(0,0,0)]">
          <p className="text-xs font-medium">
            USE AT YOUR OWN RISK. By using this site, you accept all responsibility for any financial losses or technical issues.
          </p>
        </div>
      </div>
    </footer>
  );
} 