import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
}

// react-markdown doesn't render raw HTML unless rehype-raw is added, so
// this stays safe against caption-borne script/style injection by default.
export default function MarkdownContent({ content }: Props) {
  return (
    <div
      className="text-sm [&_a]:underline [&_a]:text-blue-600 [&_strong]:font-semibold
        [&_em]:italic [&_code]:bg-gray-100 [&_code]:rounded [&_code]:px-1 [&_code]:text-xs
        [&_pre]:bg-gray-100 [&_pre]:rounded-lg [&_pre]:p-2 [&_pre]:overflow-x-auto
        [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
        [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500
        [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold
        [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
