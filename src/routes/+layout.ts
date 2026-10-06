// Static site; the games need localStorage and speechSynthesis, so render in the browser only.
export const prerender = true;
export const ssr = false;
// Emit letter-leap/index.html etc., which every static host serves without rewrites.
export const trailingSlash = 'always';
