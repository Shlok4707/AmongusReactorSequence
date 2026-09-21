export function Vent() {
  return (
    <div className="relative h-[70px] w-[90px]">
      <div
        className="h-full w-full rounded-sm border border-black/80 p-2"
        style={{
          background: 'linear-gradient(180deg, #1c1e21 0%, #101113 100%)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex h-full flex-col justify-between">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-[3px] rounded-full"
              style={{
                background: 'linear-gradient(180deg, #050505 0%, #2a2c2f 45%, #050505 100%)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.05)',
              }}
            />
          ))}
        </div>
      </div>
      {/* connecting pipe elbow beneath */}
      <div className="pipe absolute -bottom-3 left-2 h-4 w-2.5" />
      <div className="pipe absolute -bottom-3 left-2 h-2.5 w-6" />
    </div>
  );
}
