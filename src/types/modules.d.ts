/**
 * Type declarations for CSS and other module imports
 */

declare module 'xterm/css/xterm.css';
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}
