import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";

interface SubtitlePayload {
	lines: string[];
	original?: string;
	fontSize: number;
	bgColor?: string;
	textColor?: string;
}

export function SubtitleApp() {
	const [lines, setLines] = useState<string[]>([]);
	const [original, setOriginal] = useState("");
	const [fontSize, setFontSize] = useState(28);
	const [bgColor, setBgColor] = useState("rgba(0,0,0,0.75)");
	const [textColor, setTextColor] = useState("#ffffff");

	const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const unlisten = listen<SubtitlePayload>("subtitle-update", (e) => {
			setLines(e.payload.lines);
			setOriginal(e.payload.original || "");
			setFontSize(e.payload.fontSize);
			if (e.payload.bgColor) setBgColor(e.payload.bgColor);
			if (e.payload.textColor) setTextColor(e.payload.textColor);

			if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
			if (e.payload.lines.length > 0) {
				clearTimerRef.current = setTimeout(() => {
					setLines([]);
					setOriginal("");
				}, 3000);
			}
		});
		return () => {
			unlisten.then((fn) => fn());
			if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
		};
	}, []);

	const hasContent = lines.length > 0 || original;

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "flex-end",
				justifyContent: "center",
				padding: "0 48px 24px",
				pointerEvents: "none",
			}}
		>
			<div style={{ textAlign: "center", maxWidth: "80%" }}>
				{!hasContent && (
					<div
						style={{
							background: "rgba(0,0,0,0.5)",
							color: "rgba(255,255,255,0.5)",
							padding: "4px 14px",
							fontSize: "14px",
							fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
							borderRadius: "8px",
						}}
					>
						Subtitles will appear here...
					</div>
				)}
				{original && (
					<div
						style={{
							background: bgColor,
							color: textColor,
							opacity: 0.65,
							padding: "2px 14px",
							fontSize: `${fontSize * 0.75}px`,
							fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
							marginBottom: "4px",
							display: "inline-block",
							borderRadius: "8px",
						}}
					>
						{original}
					</div>
				)}
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
					{lines.map((line, i) => {
						const isLast = i === lines.length - 1;
						return (
							<span
								key={i}
								style={{
									display: "inline-block",
									background: bgColor,
									color: textColor,
									padding: isLast ? "6px 16px" : "4px 12px",
									fontSize: isLast ? `${fontSize}px` : `${fontSize * 0.7}px`,
									fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
									fontWeight: 500,
									lineHeight: 1.8,
									letterSpacing: "0.02em",
									opacity: isLast ? 1 : 0.6,
									boxDecorationBreak: "clone" as const,
									WebkitBoxDecorationBreak: "clone" as const,
									borderRadius: "8px",
								}}
							>
								{line}
							</span>
						);
					})}
				</div>
			</div>
		</div>
	);
}
