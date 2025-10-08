import svgPaths from "./svg-334iaotccc";

function Frame8() {
  return (
    <div className="absolute bg-[rgba(229,229,229,0.93)] box-border content-stretch flex flex-col gap-[15px] items-center justify-center left-0 p-[15px] rounded-tl-[10px] rounded-tr-[10px] top-0 w-[907px]">
      <div aria-hidden="true" className="absolute border-[4px_4px_2px] border-[grey] border-solid inset-[-2px_-2px_-1px_-2px] pointer-events-none rounded-tl-[12px] rounded-tr-[12px]" />
      <p className="font-['IBM_Plex_Mono:Bold',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[0px] text-[20px] text-black text-nowrap whitespace-pre">
        RETRO<span className="font-['IBM_Plex_Mono:Medium',_sans-serif]">CAMERA</span>
      </p>
    </div>
  );
}

function LiveView() {
  return <div className="aspect-[1600/900] bg-black rounded-[10px] shrink-0 w-full" data-name="Live View" />;
}

function Icon() {
  return (
    <div className="absolute left-[14.5px] size-[14px] top-[8.75px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="Icon">
          <path d={svgPaths.pd1fd280} id="Vector" stroke="var(--stroke-0, #808080)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d={svgPaths.p23779700} id="Vector_2" stroke="var(--stroke-0, #808080)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="h-[31.5px] relative rounded-[8.75px] shrink-0 w-[145.188px]" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[grey] border-solid inset-0 pointer-events-none rounded-[8.75px]" />
      <Icon />
      <p className="absolute font-['IBM_Plex_Mono:Bold',_sans-serif] leading-[17.5px] left-[42.5px] not-italic text-[12.25px] text-[grey] text-nowrap top-[7px] whitespace-pre">START CAMERA</p>
    </div>
  );
}

function PreviewPanel() {
  return (
    <div className="bg-neutral-200 relative rounded-[10px] shrink-0 w-full" data-name="Preview Panel">
      <div className="flex flex-col items-center size-full">
        <div className="box-border content-stretch flex flex-col gap-[15px] items-center p-[15px] relative w-full">
          <LiveView />
          <Button />
        </div>
      </div>
    </div>
  );
}

function Frame7() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[5px] items-center pb-0 pt-[15px] px-[15px] relative w-full">
          <p className="font-['IBM_Plex_Mono:Medium',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-black text-nowrap whitespace-pre">COLOR MODE</p>
        </div>
      </div>
    </div>
  );
}

function Frame3() {
  return (
    <div className="bg-[grey] relative rounded-[5px] shrink-0 w-[80px]">
      <div className="box-border content-stretch flex gap-[5px] items-center justify-center overflow-clip p-[5px] relative w-[80px]">
        <p className="font-['IBM_Plex_Mono:Medium',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-neutral-200 text-nowrap whitespace-pre">PEA SOUP</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[grey] border-solid inset-0 pointer-events-none rounded-[5px]" />
    </div>
  );
}

function Frame4() {
  return (
    <div className="bg-neutral-200 relative rounded-[5px] shrink-0 w-[80px]">
      <div className="box-border content-stretch flex gap-[5px] items-center justify-center overflow-clip p-[5px] relative w-[80px]">
        <p className="font-['IBM_Plex_Mono:Medium',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-neutral-700 text-nowrap whitespace-pre">GREYSCALE</p>
      </div>
      <div aria-hidden="true" className="absolute border border-neutral-700 border-solid inset-0 pointer-events-none rounded-[5px]" />
    </div>
  );
}

function Frame2() {
  return (
    <div className="box-border content-stretch flex gap-[5px] items-start overflow-clip p-[15px] relative rounded-[10px] shrink-0">
      <Frame3 />
      <Frame4 />
    </div>
  );
}

function Color() {
  return (
    <div className="bg-neutral-200 relative rounded-[10px] shrink-0" data-name="Color">
      <div className="box-border content-stretch flex flex-col items-start overflow-clip p-[5px] relative">
        <Frame7 />
        <Frame2 />
      </div>
      <div aria-hidden="true" className="absolute border border-[#bfbfbf] border-solid inset-0 pointer-events-none rounded-[10px]" />
    </div>
  );
}

function Frame13() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[5px] items-center pb-0 pt-[15px] px-[15px] relative w-full">
          <p className="font-['IBM_Plex_Mono:Medium',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-black text-nowrap whitespace-pre">SHADES</p>
        </div>
      </div>
    </div>
  );
}

function Frame14() {
  return (
    <div className="bg-[grey] relative rounded-[5px] shrink-0 w-[30px]">
      <div className="box-border content-stretch flex gap-[5px] items-center justify-center overflow-clip p-[5px] relative w-[30px]">
        <p className="font-['IBM_Plex_Mono:Medium',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-neutral-200 text-nowrap whitespace-pre">2</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[grey] border-solid inset-0 pointer-events-none rounded-[5px]" />
    </div>
  );
}

function Frame15() {
  return (
    <div className="bg-neutral-200 relative rounded-[5px] shrink-0 w-[30px]">
      <div className="box-border content-stretch flex gap-[5px] items-center justify-center overflow-clip p-[5px] relative w-[30px]">
        <p className="font-['IBM_Plex_Mono:Medium',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-neutral-700 text-nowrap whitespace-pre">4</p>
      </div>
      <div aria-hidden="true" className="absolute border border-neutral-700 border-solid inset-0 pointer-events-none rounded-[5px]" />
    </div>
  );
}

function Frame5() {
  return (
    <div className="bg-neutral-200 relative rounded-[5px] shrink-0 w-[30px]">
      <div className="box-border content-stretch flex gap-[5px] items-center justify-center overflow-clip p-[5px] relative w-[30px]">
        <p className="font-['IBM_Plex_Mono:Medium',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-neutral-700 text-nowrap whitespace-pre">8</p>
      </div>
      <div aria-hidden="true" className="absolute border border-neutral-700 border-solid inset-0 pointer-events-none rounded-[5px]" />
    </div>
  );
}

function Frame6() {
  return (
    <div className="bg-neutral-200 relative rounded-[5px] shrink-0 w-[30px]">
      <div className="box-border content-stretch flex gap-[5px] items-center justify-center overflow-clip p-[5px] relative w-[30px]">
        <p className="font-['IBM_Plex_Mono:Medium',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-neutral-700 text-nowrap whitespace-pre">16</p>
      </div>
      <div aria-hidden="true" className="absolute border border-neutral-700 border-solid inset-0 pointer-events-none rounded-[5px]" />
    </div>
  );
}

function Frame16() {
  return (
    <div className="box-border content-stretch flex gap-[5px] items-start overflow-clip p-[15px] relative rounded-[10px] shrink-0">
      <Frame14 />
      <Frame15 />
      <Frame5 />
      <Frame6 />
    </div>
  );
}

function Shades() {
  return (
    <div className="bg-neutral-200 relative rounded-[10px] shrink-0" data-name="Shades">
      <div className="box-border content-stretch flex flex-col items-start overflow-clip p-[5px] relative">
        <Frame13 />
        <Frame16 />
      </div>
      <div aria-hidden="true" className="absolute border border-[#bfbfbf] border-solid inset-0 pointer-events-none rounded-[10px]" />
    </div>
  );
}

function Frame17() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex gap-[5px] items-center pb-0 pt-[15px] px-[15px] relative w-full">
          <p className="font-['IBM_Plex_Mono:Medium',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-black text-nowrap whitespace-pre">PIXELS</p>
        </div>
      </div>
    </div>
  );
}

function Frame18() {
  return (
    <div className="bg-[grey] relative rounded-[5px] shrink-0 w-[55px]">
      <div className="box-border content-stretch flex gap-[5px] items-center justify-center overflow-clip p-[5px] relative w-[55px]">
        <p className="font-['IBM_Plex_Mono:Medium',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-neutral-200 text-nowrap whitespace-pre">CHUNKY</p>
      </div>
      <div aria-hidden="true" className="absolute border border-[grey] border-solid inset-0 pointer-events-none rounded-[5px]" />
    </div>
  );
}

function Frame19() {
  return (
    <div className="bg-neutral-200 relative rounded-[5px] shrink-0 w-[55px]">
      <div className="box-border content-stretch flex gap-[5px] items-center justify-center overflow-clip p-[5px] relative w-[55px]">
        <p className="font-['IBM_Plex_Mono:Medium',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-neutral-700 text-nowrap whitespace-pre">MEDIUM</p>
      </div>
      <div aria-hidden="true" className="absolute border border-neutral-700 border-solid inset-0 pointer-events-none rounded-[5px]" />
    </div>
  );
}

function Frame20() {
  return (
    <div className="bg-neutral-200 relative rounded-[5px] shrink-0 w-[55px]">
      <div className="box-border content-stretch flex gap-[5px] items-center justify-center overflow-clip p-[5px] relative w-[55px]">
        <p className="font-['IBM_Plex_Mono:Medium',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-neutral-700 text-nowrap whitespace-pre">FINE</p>
      </div>
      <div aria-hidden="true" className="absolute border border-neutral-700 border-solid inset-0 pointer-events-none rounded-[5px]" />
    </div>
  );
}

function Frame21() {
  return (
    <div className="box-border content-stretch flex gap-[5px] items-start overflow-clip p-[15px] relative rounded-[10px] shrink-0">
      <Frame18 />
      <Frame19 />
      <Frame20 />
    </div>
  );
}

function Pixels() {
  return (
    <div className="bg-neutral-200 relative rounded-[10px] shrink-0" data-name="Pixels">
      <div className="box-border content-stretch flex flex-col items-start overflow-clip p-[5px] relative">
        <Frame17 />
        <Frame21 />
      </div>
      <div aria-hidden="true" className="absolute border border-[#bfbfbf] border-solid inset-0 pointer-events-none rounded-[10px]" />
    </div>
  );
}

function SettingOptions() {
  return (
    <div className="content-stretch flex gap-[5px] items-center justify-center relative shrink-0" data-name="Setting Options">
      <Color />
      <Shades />
      <Pixels />
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="bg-neutral-200 relative rounded-[10px] shrink-0 w-full" data-name="Settings Panel">
      <div className="flex flex-col items-center justify-center overflow-clip size-full">
        <div className="box-border content-stretch flex flex-col gap-[10px] items-center justify-center px-[15px] py-[25px] relative w-full">
          <SettingOptions />
        </div>
      </div>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex flex-col gap-[15px] items-center justify-center relative shrink-0 w-[640px]">
      <PreviewPanel />
      <SettingsPanel />
    </div>
  );
}

function CapturedImage() {
  return (
    <div className="bg-black h-[90px] relative rounded-[10px] shrink-0 w-full" data-name="Captured Image">
      <div aria-hidden="true" className="absolute border border-[grey] border-solid inset-0 pointer-events-none rounded-[10px]" />
    </div>
  );
}

function CapturedImages() {
  return (
    <div className="content-stretch flex flex-col gap-[15px] h-[480px] items-start overflow-clip relative shrink-0 w-full" data-name="CAPTURED IMAGES">
      {[...Array(5).keys()].map((_, i) => (
        <CapturedImage key={i} />
      ))}
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-neutral-200 relative rounded-[8.75px] shrink-0 w-full" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[grey] border-solid inset-0 pointer-events-none rounded-[8.75px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="box-border content-stretch flex gap-[5px] items-center justify-center p-[5px] relative w-full">
          <p className="font-['IBM_Plex_Mono:Bold',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-[grey] text-nowrap whitespace-pre">CLEAR ALL</p>
        </div>
      </div>
    </div>
  );
}

function Gallery() {
  return (
    <div className="bg-neutral-200 box-border content-stretch flex flex-col gap-[15px] h-[586px] items-start overflow-clip p-[15px] relative rounded-[10px] shrink-0 w-[192px]" data-name="Gallery">
      <p className="font-['IBM_Plex_Mono:Bold',_sans-serif] leading-[17.5px] not-italic relative shrink-0 text-[12.25px] text-black text-nowrap whitespace-pre">GALLERY</p>
      <CapturedImages />
      <Button1 />
    </div>
  );
}

function Frame10() {
  return (
    <div className="absolute bg-[grey] box-border content-stretch flex gap-[15px] items-center justify-center left-0 p-[15px] rounded-[10px] top-0 w-[877px]">
      <Frame9 />
      <Gallery />
    </div>
  );
}

function Frame12() {
  return (
    <div className="h-[616px] relative shrink-0 w-[877px]">
      <Frame10 />
    </div>
  );
}

function Frame11() {
  return (
    <div className="absolute bg-[#bfbfbf] box-border content-stretch flex flex-col gap-[5px] items-center justify-center left-0 p-[15px] rounded-bl-[10px] rounded-br-[10px] top-[48px] w-[907px]">
      <div aria-hidden="true" className="absolute border-[2px_4px_4px] border-[grey] border-solid inset-[-1px_-2px_-2px_-2px] pointer-events-none rounded-bl-[12px] rounded-br-[12px]" />
      <Frame12 />
    </div>
  );
}

export default function RetroCameraLayout() {
  return (
    <div className="relative size-full" data-name="Retro Camera Layout">
      <Frame8 />
      <Frame11 />
    </div>
  );
}