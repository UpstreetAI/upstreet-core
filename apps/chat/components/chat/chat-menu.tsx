import { useSidebar } from '@/lib/client/hooks/use-sidebar';
import { isValidUrl } from '@/lib/utils';

export interface Player {
  getPlayerSpec: () => {
    name: string;
    previewUrl: string;
  };
}

export interface ChatMenuProps {
  players: Player[];
}

export function ChatMenu({ players }: ChatMenuProps) {
  const { toggleRightSidebar, isLeftSidebarOpen, isRightSidebarOpen } = useSidebar();

  return (
    <div
      className={`fixed z-[100] bg-gray-300 top-18 left-0 w-full ease-in-out duration-300 animate-in border-b ${
        isLeftSidebarOpen ? 'lg:pl-[250px] xl:pl-[300px]' : ''
      } ${isRightSidebarOpen ? 'lg:pr-[250px] xl:pr-[300px]' : ''}`}
    >
      <div className="space-y-4 px-4 sm:max-w-2xl mx-auto relative flex">
        <div className="flex p-4 border-b border-gray-300 w-full">
          <div className="flex w-full items-center">
            <div className="mr-4 size-12 min-w-12 md:size-12 md:min-w-12 bg-gray-100 p-1 overflow-hidden flex items-center justify-center border-2 border-gray-900">
              <div
                className="w-full h-full bg-cover bg-top"
                style={{
                  backgroundImage: 'url(/images/backgrounds/rooms/default-bg.jpg)',
                  backgroundColor: '#ccc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#fff',
                }}
              />
            </div>
            <h2 className="text-2xl font-semibold">ROOM NAME</h2>
          </div>

          <div className="flex items-center">
            <div className="flex -space-x-4 mr-4">
              {players?.map((player) => {
                const { name, previewUrl } = player.getPlayerSpec();
                return (
                  <div
                    key={name}
                    className="size-10 bg-cover bg-top rounded-full border-2 border-white"
                    style={{
                      backgroundImage: isValidUrl(previewUrl) ? `url(${previewUrl})` : 'none',
                      backgroundColor: isValidUrl(previewUrl) ? 'transparent' : '#ccc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                      fontWeight: 'bold',
                      color: '#fff',
                    }}
                  >
                    {!isValidUrl(previewUrl) && name.charAt(0)}
                  </div>
                );
              })}
            </div>
            <div className="text-lg font-medium whitespace-nowrap">{players?.length} member{players.length > 1 && "s"}</div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-gray-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-gray-200" onClick={toggleRightSidebar}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm6 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm6 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
