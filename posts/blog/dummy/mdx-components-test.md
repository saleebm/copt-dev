---
title: "MDX Components Test"
tags: "documentation"
status: "PUBLISHED"
---

# MDX Components Test

This is a test post to demonstrate all the custom MDX components and improved styling.

## Typography Test

### Heading Level 3
#### Heading Level 4
##### Heading Level 5
###### Heading Level 6

This is a paragraph with proper spacing and line height. It should be easy to read and have appropriate margins.

## List Indentation Test

Here's an unordered list that should now have proper indentation:

- First level item
- Another first level item
  - Second level item (this should be indented)
  - Another second level item
    - Third level item (even more indented)
- Back to first level

And here's an ordered list:

1. First item
2. Second item
   1. Nested item one
   2. Nested item two
      1. Deep nested item
3. Third item

## Code and Blockquotes

Here's some `inline code` that should be styled properly.

```javascript
// This is a code block
function hello() {
  console.log("Hello, world!");
}
```

> This is a blockquote that should have proper styling with a border and background.
> It can span multiple lines and should look good.

## Image Testing

### Default Image Behavior

Here's a standard markdown image (using the enhanced img component):

![Golden Eye](/post-pics/golden_red_light_eye.png)

### Custom Image Component Tests

#### Basic Custom Image (PNG)

<Image 
  src="/post-pics/golden_red_light_eye.png" 
  alt="Golden Red Light Eye PNG" 
  caption="This is a PNG image with default settings"
/>

#### Custom Image with Size Configuration (SVG)

<Image
src="/post-pics/golden_red_light_eye.svg"
alt="Golden Red Light Eye SVG"
width={300}
height={300}
caption="SVG image resized to 300x300 pixels"
/>

#### Left-Aligned Image

<Image
src="/post-pics/golden_red_light_eye.png"
alt="Left aligned image"
width="250px"
placement="left"
caption="This image is aligned to the left with 250px width"
/>

#### Right-Aligned Image

<Image
src="/post-pics/golden_red_light_eye.svg"
alt="Right aligned image"
width={200}
placement="right"
caption="This SVG is aligned to the right with 200px width"
/>

#### Center-Aligned Image with Custom Width

<Image
src="/post-pics/golden_red_light_eye.png"
alt="Center aligned image"
width="50%"
placement="center"
caption="This image is centered and takes up 50% of the container width"
/>


#### Multiple Image Types Using ImageGrid

<ImageGrid columns={2} gap="md">
  <Image 
    src="/post-pics/golden_red_light_eye.png" 
    alt="PNG version" 
    width={150}
    caption="PNG Format"
  />
  <Image 
    src="/post-pics/golden_red_light_eye.svg" 
    alt="SVG version" 
    width={150}
    caption="SVG Format"
  />
</ImageGrid>
#### Large Image with Height Constraint

<Image
src="/post-pics/golden_red_light_eye.png"
alt="Height constrained image"
height={200}
caption="This image has its height constrained to 200px (width adjusts automatically)"
/>

## ASCII Art Component Test

<AsciiArtRenderer asciiArt={`
    /\\_/\\  
   (  o.o  ) 
    > ^ <
  🎉 Custom MDX Components Working! 🎉
`} />

The ASCII art above should be automatically sized to fit its container!

## Links and Other Elements

Here's a [test link](https://example.com) with proper styling.

---

This horizontal rule should have proper spacing.

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

The table above should be properly styled with borders and spacing.

### Image Component Features Demonstrated:

- ✅ **Basic image display** with enhanced styling
- ✅ **Width and height configuration** (pixels and percentages)
- ✅ **Placement options** (left, center, right alignment)
- ✅ **Captions** with proper styling
- ✅ **Multiple image formats** (PNG and SVG support)
- ✅ **Responsive behavior** with proper aspect ratio maintenance
- ✅ **ImageGrid component** for proper layout patterns instead of HTML divs
- ✅ **Proper MDX patterns** avoiding inline styles and raw HTML elements

## PostLink Components Usage

The new PostLink components allow you to create interactive links within MDX content that use the client-side post management system while preserving server-side rendering.

### Available Components

#### 1. PostLink (Basic)
Creates a standard link with primary color styling:

Check out this <PostLink postId="now">related post (now)</PostLink>.

### 2. RelatedPostLink
Creates a link with an icon and secondary styling for related content:

<RelatedPostLink postId="hlexicon-test">Another interesting article (hlexicon test)</RelatedPostLink>

#### 3. ButtonPostLink
Creates a button-styled link for call-to-action scenarios:

<ButtonPostLink postId="weekly-check-in">Get Started (weekly check-in)</ButtonPostLink>

### How It Works

1. **Server Rendering**: The MDX content is rendered on the server with fallback URLs
2. **Client Enhancement**: When JavaScript loads, the links are enhanced with client-side functionality
3. **Progressive Enhancement**: Links work even without JavaScript (fallback to standard navigation)
4. **Context Integration**: Uses the PostStackActionsContext to call addPost from use-post-management.ts

### Architecture

- `PostLinkClient`: Client component that handles the interactive behavior
- `PostLink`, `RelatedPostLink`, `ButtonPostLink`: Server components that wrap the client component
- Integrated into `getMDXComponents()` for use in both server and client rendering contexts

### Benefits

- ✅ Preserves server-side rendering
- ✅ Progressive enhancement with client-side functionality  
- ✅ Reusable with different styling options
- ✅ Compatible with existing post management system
- ✅ Works in both server and client rendering contexts 

## Success!

If you can see proper styling for headings, list indentation, the ASCII art component above, and various image configurations, then our custom MDX components are working correctly! 🚀