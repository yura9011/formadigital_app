declare module 'html2pdf.js' {
    interface Html2PdfOptions {
        margin?: number | number[];
        filename?: string;
        image?: { type?: string; quality?: number };
        html2canvas?: { scale?: number; useCORS?: boolean;[key: string]: any };
        jsPDF?: { unit?: string; format?: string; orientation?: string;[key: string]: any };
        pagebreak?: { mode?: string | string[]; before?: string[]; after?: string[]; avoid?: string[] };
    }

    interface Html2PdfInstance {
        set(options: Html2PdfOptions): Html2PdfInstance;
        from(element: HTMLElement | string): Html2PdfInstance;
        save(): Promise<void>;
        output(type: string, options?: any): Promise<any>;
        then(callback: () => void): Html2PdfInstance;
        catch(callback: (error: any) => void): Html2PdfInstance;
    }

    function html2pdf(): Html2PdfInstance;
    export default html2pdf;
}
