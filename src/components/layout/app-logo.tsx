import { useTheme } from "next-themes";

export default function Logo({ text = false, isWorkbench = false }: { text?: boolean; isWorkbench?: boolean }) {
    const isdark = useTheme().theme === "dark";
    return (
        <>
            {text && (
                <div className="size-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold text-lg">
                    S
                </div>
            )}

            {!text && <img alt='logo' src={isdark ? "/logo-dark.svg" : "/logo.svg"} className='h-8' />}

            {isWorkbench && text && (
                <span className="font-bold text-base text-foreground leading-tight">
                    Sigma ToolBox
                </span>
            )}
        </>
    );
}