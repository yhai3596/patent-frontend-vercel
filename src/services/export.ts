import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import type { Disclosure, DisclosureContent } from '@/types';

// 导出为Word文档
export async function exportToWord(disclosure: Disclosure): Promise<Blob> {
  const { content, type, authorName, createdAt } = disclosure;
  
  // 创建文档
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440, // 1 inch = 1440 twips
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: [
        // 标题
        new Paragraph({
          text: '技术交底书',
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        
        // 基本信息表格
        createInfoTable(content, type, authorName, createdAt),
        
        // 分隔线
        new Paragraph({
          text: '',
          spacing: { before: 200, after: 200 },
          border: {
            bottom: {
              color: '000000',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        }),
        
        // 各章节内容
        ...createChapterContent(content),
      ],
    }],
  });

  // 生成Blob
  const blob = await Packer.toBlob(doc);
  return blob;
}

// 创建基本信息表格
function createInfoTable(
  content: DisclosureContent, 
  type: string, 
  authorName: string, 
  createdAt: string
): Paragraph {
  const infoItems = [
    { label: '发明名称', value: content.title || '（未填写）' },
    { label: '专利类型', value: type },
    { label: '技术领域', value: content.technicalField || '（未填写）' },
    { label: '发明人', value: authorName },
    { label: '撰写日期', value: new Date(createdAt).toLocaleDateString('zh-CN') },
  ];

  const paragraphs: Paragraph[] = [];
  
  infoItems.forEach(item => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${item.label}：`,
            bold: true,
            size: 24, // 12pt
          }),
          new TextRun({
            text: item.value,
            size: 24,
          }),
        ],
        spacing: { after: 120 },
      })
    );
  });

  // 返回组合段落
  return new Paragraph({
    children: [
      new TextRun({
        text: '',
      }),
    ],
    spacing: { after: 200 },
  });
}

// 创建章节内容
function createChapterContent(content: DisclosureContent): Paragraph[] {
  const chapters = [
    { key: 'backgroundArt', title: '一、背景技术', required: true },
    { key: 'inventionContent', title: '二、发明内容', required: true },
    { key: 'technicalSolution', title: '三、技术方案', required: true },
    { key: 'beneficialEffects', title: '四、有益效果', required: true },
    { key: 'figureDescription', title: '五、附图说明', required: false },
    { key: 'implementation', title: '六、具体实施方式', required: true },
    { key: 'claimsSuggestion', title: '七、权利要求建议', required: false },
  ] as const;

  const paragraphs: Paragraph[] = [];

  chapters.forEach(chapter => {
    const chapterContent = content[chapter.key as keyof DisclosureContent];
    
    // 章节标题
    paragraphs.push(
      new Paragraph({
        text: chapter.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    // 章节内容
    if (chapterContent) {
      // 按段落分割内容
      const lines = chapterContent.split('\n').filter(line => line.trim());
      
      if (lines.length > 0) {
        lines.forEach(line => {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.trim(),
                  size: 24,
                }),
              ],
              spacing: { after: 200 },
              indent: { firstLine: 480 }, // 首行缩进
            })
          );
        });
      } else {
        paragraphs.push(createEmptyParagraph());
      }
    } else {
      paragraphs.push(createEmptyParagraph());
    }
  });

  return paragraphs;
}

// 创建空内容提示
function createEmptyParagraph(): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: '（此章节尚未填写内容）',
        italics: true,
        color: '999999',
        size: 24,
      }),
    ],
    spacing: { after: 200 },
  });
}

// 下载文件
export function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// 导出为PDF（使用浏览器打印功能）
export function exportToPDF(disclosure: Disclosure): void {
  // 创建打印窗口
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('请允许弹出窗口以导出PDF');
    return;
  }

  const { content, type, authorName, createdAt } = disclosure;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${content.title || '技术交底书'}</title>
      <style>
        @media print {
          body {
            font-family: 'SimSun', '宋体', serif;
            font-size: 12pt;
            line-height: 1.8;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 22pt;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .info-table {
            width: 100%;
            margin-bottom: 30px;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 8px 0;
            font-size: 12pt;
          }
          .info-table .label {
            font-weight: bold;
            width: 120px;
          }
          .chapter {
            margin-top: 30px;
          }
          .chapter-title {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 15px;
          }
          .chapter-content {
            text-indent: 2em;
            margin-bottom: 15px;
            text-align: justify;
          }
          .empty {
            color: #999;
            font-style: italic;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>技术交底书</h1>
      </div>
      
      <table class="info-table">
        <tr>
          <td class="label">发明名称：</td>
          <td>${content.title || '（未填写）'}</td>
        </tr>
        <tr>
          <td class="label">专利类型：</td>
          <td>${type}</td>
        </tr>
        <tr>
          <td class="label">技术领域：</td>
          <td>${content.technicalField || '（未填写）'}</td>
        </tr>
        <tr>
          <td class="label">发明人：</td>
          <td>${authorName}</td>
        </tr>
        <tr>
          <td class="label">撰写日期：</td>
          <td>${new Date(createdAt).toLocaleDateString('zh-CN')}</td>
        </tr>
      </table>

      <div class="chapter">
        <div class="chapter-title">一、背景技术</div>
        <div class="chapter-content">${formatContent(content.backgroundArt)}</div>
      </div>

      <div class="chapter">
        <div class="chapter-title">二、发明内容</div>
        <div class="chapter-content">${formatContent(content.inventionContent)}</div>
      </div>

      <div class="chapter">
        <div class="chapter-title">三、技术方案</div>
        <div class="chapter-content">${formatContent(content.technicalSolution)}</div>
      </div>

      <div class="chapter">
        <div class="chapter-title">四、有益效果</div>
        <div class="chapter-content">${formatContent(content.beneficialEffects)}</div>
      </div>

      <div class="chapter">
        <div class="chapter-title">五、附图说明</div>
        <div class="chapter-content">${formatContent(content.figureDescription)}</div>
      </div>

      <div class="chapter">
        <div class="chapter-title">六、具体实施方式</div>
        <div class="chapter-content">${formatContent(content.implementation)}</div>
      </div>

      <div class="chapter">
        <div class="chapter-title">七、权利要求建议</div>
        <div class="chapter-content">${formatContent(content.claimsSuggestion)}</div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

// 格式化内容
function formatContent(content: string): string {
  if (!content || content.trim() === '') {
    return '<span class="empty">（此章节尚未填写内容）</span>';
  }
  
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => `<p>${escapeHtml(line.trim())}</p>`)
    .join('');
}

// HTML转义
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
