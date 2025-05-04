import { DisclaimerModal } from "@/components/DisclaimerModal";
import { AlertTriangle } from "lucide-react";
import { SiGithub } from '@icons-pack/react-simple-icons';


export function Footer() {
  return (
    <footer>
      <div className="fixed bottom-0 left-0 right-0 p-3 text-center">
        <div className="bg-blue-400 border-4 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0)] transition-all duration-200 mx-auto max-w-xl">
          <div className="flex justify-center items-center py-2 px-4 gap-3">
            <DisclaimerModal>
              <div className="flex items-center gap-1">
                <AlertTriangle size={12} />
                <span>Use at your own risk.</span>
              </div>
            </DisclaimerModal>
            <div className="h-4 border-r-2 border-black"></div>
            <a
              href="https://github.com/dylanvanh/pixel-pythons"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold bg-white text-black px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-1"
              aria-label="GitHub"
            >
              <SiGithub size={12} />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
