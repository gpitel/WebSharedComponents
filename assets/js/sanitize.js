import DOMPurify from 'dompurify';

// Engine-generated SVG (MKF painter, MVB++ technical drawings) carries text taken
// straight from the design: turn and winding names end up in <title> and <text>
// elements without any escaping. Every SVG string goes through here before it is
// written into the DOM, including copies restored from persisted state.
//
// DOMPurify's svg profile keeps the drawing (shapes, <style>, <title>, <text>,
// classes, transforms, viewBox) and drops scripts, event-handler attributes,
// foreignObject and javascript: URLs.
export function sanitizeSvg(svg) {
    if (typeof svg !== 'string') {
        throw new TypeError(`sanitizeSvg expects an SVG string, got ${svg === null ? 'null' : typeof svg}`);
    }
    return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
}
