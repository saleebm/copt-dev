import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { AsciiArtWrapper } from "@/components/ascii-art-wrapper";
import {
  Accordion as AccordionComponent,
  AccordionContent as AccordionContentComponent,
  AccordionItem as AccordionItemComponent,
  AccordionTrigger as AccordionTriggerComponent,
} from "@/components/ui/accordion";
import { parseYouTubeUrl } from "@/lib/ingest/youtube-url";
import { FindingsList } from "./findings-list";
import { Hlexicon } from "./hlexicon";
import { ButtonPostLink, PostLink, RelatedPostLink } from "./mdx/post-link";
import { BracketedPostName } from "./shared/bracketed-post-name";
import { CenteredText } from "./shared/centered-text";
import { SightsList } from "./sights-list";

interface YouTubeEmbedProps {
  className?: string;
  start?: number;
  title?: string;
  url?: string;
  videoId?: string;
}

function YouTubeEmbed({
  url,
  videoId,
  start,
  title = "YouTube video",
  className = "",
}: YouTubeEmbedProps) {
  let resolvedId = videoId?.trim() || null;
  let resolvedStart = typeof start === "number" && start > 0 ? start : null;
  if (!resolvedId && url) {
    const parsed = parseYouTubeUrl(url);
    if (parsed) {
      resolvedId = parsed.videoId;
      resolvedStart = resolvedStart ?? parsed.startSeconds;
    }
  }
  if (!resolvedId) {
    return null;
  }
  const params = new URLSearchParams({ rel: "0" });
  if (resolvedStart) {
    params.set("start", String(resolvedStart));
  }
  const src = `https://www.youtube-nocookie.com/embed/${resolvedId}?${params.toString()}`;
  const classes = ["youtube-embed", className].filter(Boolean).join(" ");
  return (
    <figure className={classes}>
      <div className="youtube-embed__frame">
        <iframe
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={src}
          title={title}
        />
      </div>
    </figure>
  );
}

// Custom Image component with configuration options
interface CustomImageProps {
  alt?: string;
  caption?: string;
  className?: string;
  height?: number | string;
  placement?: "left" | "center" | "right";
  src: string;
  width?: number | string;
}

function CustomImage({
  src,
  alt,
  width,
  height,
  placement = "center",
  caption,
  className = "",
}: CustomImageProps) {
  const placementClasses = {
    left: "mr-auto",
    center: "mx-auto",
    right: "ml-auto",
  };

  const imageStyle: React.CSSProperties = {};
  if (width) {
    imageStyle.width = typeof width === "number" ? `${width}px` : width;
  }
  if (height) {
    imageStyle.height = typeof height === "number" ? `${height}px` : height;
  }

  return (
    <figure className={`my-6 ${placementClasses[placement]} ${className}`}>
      <Image
        alt={alt || ""}
        className="block rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md"
        height={typeof height === "number" ? height : 600}
        src={src}
        style={imageStyle}
        width={typeof width === "number" ? width : 800}
      />
      {caption && (
        <figcaption className="mt-2 text-center text-foreground/70 text-sm italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// Image Grid component for side-by-side layouts
interface ImageGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
}

function ImageGrid({
  children,
  columns = 2,
  gap = "md",
  className = "",
}: ImageGridProps) {
  const columnClasses = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  const gapClasses = {
    sm: "gap-4",
    md: "gap-6",
    lg: "gap-8",
  };

  return (
    <div
      className={`grid ${columnClasses[columns]} ${gapClasses[gap]} my-6 ${className}`}
    >
      {children}
    </div>
  );
}

// Custom components for MDX content
export function getMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Headings with proper typography hierarchy and subtle animations
    h1: ({ className, ...props }) => (
      <h1
        className={`mt-10 mb-6 font-bold text-4xl text-foreground leading-tight first:mt-0 md:text-5xl ${className || ""}`}
        {...props}
      />
    ),
    h2: ({ className, ...props }) => (
      <h2
        className={`mt-8 mb-5 font-semibold text-3xl text-foreground leading-snug md:text-4xl ${className || ""}`}
        {...props}
      />
    ),
    h3: ({ className, ...props }) => (
      <h3
        className={`mt-6 mb-4 font-semibold text-2xl text-foreground leading-snug md:text-3xl ${className || ""}`}
        {...props}
      />
    ),
    h4: ({ className, ...props }) => (
      <h4
        className={`mt-5 mb-3 font-medium text-foreground text-xl leading-normal md:text-2xl ${className || ""}`}
        {...props}
      />
    ),
    h5: ({ className, ...props }) => (
      <h5
        className={`mt-4 mb-3 font-medium text-foreground text-lg leading-normal md:text-xl ${className || ""}`}
        {...props}
      />
    ),
    h6: ({ className, ...props }) => (
      <h6
        className={`mt-4 mb-2 font-medium text-base text-foreground leading-normal md:text-lg ${className || ""}`}
        {...props}
      />
    ),

    // Paragraphs with proper spacing and subtle animation
    p: ({ className, ...props }) => (
      <p
        className={`my-4 w-full min-w-0 max-w-full text-base text-foreground/90 leading-relaxed md:text-lg ${className || ""}`}
        {...props}
      />
    ),

    // Lists with proper indentation and styling
    ul: ({ className, ...props }) => (
      <ul
        className={`my-4 ml-6 list-outside list-disc space-y-2 text-foreground/90 ${className || ""}`}
        {...props}
      />
    ),
    ol: ({ className, ...props }) => (
      <ol
        className={`my-4 ml-6 list-outside list-decimal space-y-2 text-foreground/90 ${className || ""}`}
        {...props}
      />
    ),
    li: ({ className, ...props }) => (
      <li
        className={`pl-2 text-base leading-relaxed md:text-lg ${className || ""}`}
        {...props}
      />
    ),

    // Blockquotes with animation
    blockquote: ({ className, ...props }) => (
      <blockquote
        className={`my-6 rounded-r-lg border-primary/50 border-l-4 bg-muted/50 py-4 pl-6 text-foreground/80 italic ${className || ""}`}
        {...props}
      />
    ),

    // Code blocks and inline code
    code: ({ className, children, ...props }) => {
      // const match = /language-(\w+)/.exec(className || '')
      // const language = match ? match[1] : ''

      // If this code element is inside a pre element (code block), don't render it
      // The pre element will handle the syntax highlighting
      if (props.parentNode?.tagName === "PRE") {
        return <>{children}</>;
      }

      // Inline code
      return (
        <code
          className={`rounded border bg-muted px-2 py-1 font-mono text-foreground text-sm transition-colors hover:bg-muted/80 ${className || ""}`}
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ className, children, ...props }) => {
      // Extract the code content and language from children
      const codeElement = children?.props;
      const codeContent = codeElement?.children || "";
      const codeClassName = codeElement?.className || "";
      const match = /language-(\w+)/.exec(codeClassName);
      const language = match ? match[1] : "text";

      return (
        <div
          className={`syntax-highlighter-container my-6 overflow-x-auto ${className || ""}`}
          style={{ maxWidth: "100%" }}
        >
          <SyntaxHighlighter
            customStyle={{
              margin: 0,
              borderRadius: "8px",
              fontSize: "14px",
              lineHeight: "1.5",
              overflowX: "auto",
              maxWidth: "100%",
            }}
            language={language}
            showLineNumbers={false}
            style={oneDark}
            {...props}
          >
            {String(codeContent).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      );
    },

    // Links with hover animation - detect internal post links vs external links
    a: ({ className, href, children, ...props }) => {
      // If href starts with '/' and looks like a post ID, use PostLinkClient for client-side navigation
      if (href?.startsWith("/") && !href.startsWith("//") && href.length > 1) {
        const postId = href.slice(1); // Remove leading slash
        return (
          <PostLink
            className={`text-primary underline underline-offset-2 transition-all duration-200 hover:text-primary/80 hover:underline-offset-4 ${className || ""}`}
            postId={postId}
            {...props}
          >
            {children}
          </PostLink>
        );
      }

      // External links use regular anchor tag with target="_blank"
      return (
        <a
          className={`text-primary underline underline-offset-2 transition-all duration-200 hover:text-primary/80 hover:underline-offset-4 ${className || ""}`}
          href={href}
          rel="noopener noreferrer"
          target="_blank"
          {...props}
        >
          {children}
        </a>
      );
    },

    // Tables with animation
    table: ({ className, ...props }) => (
      <div className="my-6 overflow-x-auto">
        <table
          className={`min-w-full border-collapse border border-border ${className || ""}`}
          {...props}
        />
      </div>
    ),
    thead: ({ className, ...props }) => (
      <thead className={`bg-muted ${className || ""}`} {...props} />
    ),
    tbody: ({ className, ...props }) => (
      <tbody className={className} {...props} />
    ),
    tr: ({ className, ...props }) => (
      <tr
        className={`border-border border-b transition-colors hover:bg-muted/30 ${className || ""}`}
        {...props}
      />
    ),
    th: ({ className, ...props }) => (
      <th
        className={`border-border border-r px-4 py-3 text-left font-semibold text-foreground last:border-r-0 ${className || ""}`}
        {...props}
      />
    ),
    td: ({ className, ...props }) => (
      <td
        className={`border-border border-r px-4 py-3 text-foreground/90 last:border-r-0 ${className || ""}`}
        {...props}
      />
    ),

    // Horizontal rule with animation
    hr: ({ className, ...props }) => (
      <hr
        className={`my-8 border-border border-t ${className || ""}`}
        {...props}
      />
    ),

    // Enhanced default images with better responsive behavior and animation
    img: ({ className, src, alt, ...props }) => (
      <Image
        alt={alt || ""}
        className={`my-6 h-auto max-w-full rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md ${className || ""}`}
        height={600}
        src={src || ""}
        width={800}
        {...props}
      />
    ),

    // Custom components
    AsciiArtRenderer: ({
      asciiArt,
      src,
      className,
      height,
      hero,
      ...props
    }) => (
      <div className="my-6">
        <AsciiArtWrapper
          asciiArt={asciiArt}
          className={className}
          height={height}
          hero={hero}
          src={src}
          {...props}
        />
      </div>
    ),

    CenteredText: ({ children, className, ...props }) => (
      <div className="w-full max-w-full overflow-hidden">
        <CenteredText className={className} {...props}>
          {children}
        </CenteredText>
      </div>
    ),

    Hlexicon: ({ term, definition, className, ...props }) => (
      <Hlexicon
        className={className}
        definition={definition}
        term={term}
        {...props}
      />
    ),

    // Responsive YouTube embed for finding posts
    YouTubeEmbed: ({ url, videoId, start, title, className, ...props }) => (
      <YouTubeEmbed
        className={className}
        start={start}
        title={title}
        url={url}
        videoId={videoId}
        {...props}
      />
    ),

    // Custom Image component with configuration options
    Image: CustomImage,

    // Image Grid component for layouts
    ImageGrid,

    // Post Link components for client-side navigation with hover effects
    PostLink: ({ postId, className, children, ...props }) => (
      <PostLink
        className={`text-primary underline underline-offset-2 transition-all duration-200 hover:scale-[1.02] hover:text-primary/80 hover:underline-offset-4 ${className || ""}`}
        postId={postId}
        {...props}
      >
        {children}
      </PostLink>
    ),

    RelatedPostLink: ({ postId, className, children, ...props }) => (
      <div className="transition-transform duration-200 hover:scale-[1.02]">
        <RelatedPostLink className={className} postId={postId} {...props}>
          {children}
        </RelatedPostLink>
      </div>
    ),

    ButtonPostLink: ({ postId, className, children, ...props }) => (
      <ButtonPostLink className={className} postId={postId} {...props}>
        {children}
      </ButtonPostLink>
    ),

    // Accordion components for findings posts
    Accordion: (props) => <AccordionComponent {...props} />,
    AccordionItem: AccordionItemComponent,
    AccordionTrigger: ({ className, ...props }) => (
      <AccordionTriggerComponent
        className={`transition-all duration-200 hover:scale-[1.01] hover:bg-muted/50 active:scale-[0.99] ${className || ""}`}
        {...props}
      />
    ),
    AccordionContent: ({ className, ...props }) => (
      <AccordionContentComponent
        className={`pt-2 pb-4 ${className || ""}`}
        {...props}
      />
    ),

    // BracketedPostName component for findings
    BracketedPostName: ({ postId, isActive, className, ...props }) => (
      <BracketedPostName
        className={className}
        isActive={isActive}
        postId={postId}
        {...props}
      />
    ),

    // Findings List component for daily findings posts
    FindingsList,

    // Sights List component for daily sights posts
    SightsList,

    // Allow all other components to pass through
    ...components,
  };
}

// Default export for convenience
export default getMDXComponents;
