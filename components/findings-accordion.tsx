import { MDXRemote } from "next-mdx-remote/rsc";
import { getMDXComponents } from "@/components/mdx-components";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type Finding = {
  slug: string;
  title: string;
  content: string;
  original_url?: string;
};

type FindingsAccordionProps = {
  findings: Finding[];
  className?: string;
};

export function FindingsAccordion({
  findings,
  className = "",
}: FindingsAccordionProps) {
  return (
    <div className={`prose dark:prose-invert max-w-none ${className}`}>
      <Accordion
        className="findings-accordion w-full space-y-3"
        collapsible
        type="single"
      >
        {findings.map((finding) => (
          <AccordionItem
            className="findings-accordion-item"
            data-value={finding.slug}
            key={finding.slug}
            value={finding.slug}
          >
            <AccordionTrigger className="findings-accordion-trigger">
              {finding.title}
            </AccordionTrigger>
            <AccordionContent className="findings-accordion-content">
              <div className="prose dark:prose-invert max-w-none pt-2 pb-4">
                <MDXRemote
                  components={getMDXComponents({})}
                  source={finding.content}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
