import { useEffect, useState } from "react";

export default function AssetLogo({ symbol, src, className = "" }) {
    const fallbackSrc = `https://icons.brapi.dev/icons/${encodeURIComponent(symbol)}.svg`;
    const [imageSrc, setImageSrc] = useState(src || fallbackSrc);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setImageSrc(src || fallbackSrc);
        setFailed(false);
    }, [src, fallbackSrc]);

    if (failed) {
        return <span className={`asset-symbol-mark ${className}`.trim()} aria-hidden="true">{symbol.slice(0, 1)}</span>;
    }

    return (
        <img
            className={`asset-logo ${className}`.trim()}
            src={imageSrc}
            alt=""
            loading="lazy"
            onError={() => {
                if (imageSrc !== fallbackSrc) setImageSrc(fallbackSrc);
                else setFailed(true);
            }}
        />
    );
}
