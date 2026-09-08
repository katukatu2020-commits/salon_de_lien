using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Printing;
using System.Drawing.Text;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

namespace Orimia.PosBridge
{
    internal sealed class BridgeConfig
    {
        public string PrinterName { get; set; }
        public int Port { get; set; }
    }

    internal sealed class PrintRequest
    {
        public int Version { get; set; }
        public bool DryRun { get; set; }
        public ReceiptData Receipt { get; set; }
    }

    internal sealed class ReceiptData
    {
        public List<string> Brand { get; set; }
        public string Title { get; set; }
        public List<ReceiptRow> Meta { get; set; }
        public List<ReceiptRow> Items { get; set; }
        public List<ReceiptRow> Summary { get; set; }
        public string Tax { get; set; }
        public ReceiptRow Payment { get; set; }
        public List<string> Message { get; set; }
        public List<string> Store { get; set; }
    }

    internal sealed class ReceiptRow
    {
        public string Label { get; set; }
        public string Value { get; set; }
        public string Detail { get; set; }
        public bool Emphasis { get; set; }
    }

    internal sealed class ParsedRequest
    {
        public string Method { get; set; }
        public string Path { get; set; }
        public Dictionary<string, string> Headers { get; set; }
        public byte[] Body { get; set; }
    }

    internal sealed class ReceiptRenderer : IDisposable
    {
        public const float TargetDpi = 203f;
        public const float RollWidthMm = 80f;
        public const float PrintableWidthMm = 72.1f;
        private const float PageWidth = 576f;
        private const float SideMargin = 28f;
        private const float TopMargin = 16f;
        private const float BottomFeed = 40f;
        private readonly Font brandFont;
        private readonly Font brandSubFont;
        private readonly Font titleFont;
        private readonly Font regularFont;
        private readonly Font regularBoldFont;
        private readonly Font smallFont;
        private readonly Font totalFont;
        private readonly Font totalValueFont;
        private readonly Font footerBoldFont;
        private readonly Pen hairline;
        private readonly Pen divider;
        private readonly StringFormat center;
        private readonly StringFormat right;
        private readonly StringFormat left;

        public ReceiptRenderer()
        {
            brandFont = CreateFont("Yu Mincho", 15f, FontStyle.Regular);
            brandSubFont = CreateFont("Arial", 7.2f, FontStyle.Regular);
            titleFont = CreateFont("Yu Gothic UI", 13f, FontStyle.Bold);
            regularFont = CreateFont("Yu Gothic UI", 9.3f, FontStyle.Regular);
            regularBoldFont = CreateFont("Yu Gothic UI", 9.3f, FontStyle.Bold);
            smallFont = CreateFont("Yu Gothic UI", 7.3f, FontStyle.Regular);
            totalFont = CreateFont("Yu Gothic UI", 12f, FontStyle.Bold);
            totalValueFont = CreateFont("Yu Gothic UI", 19f, FontStyle.Bold);
            footerBoldFont = CreateFont("Yu Gothic UI", 8f, FontStyle.Bold);
            hairline = new Pen(Color.Black, 1f);
            divider = new Pen(Color.FromArgb(110, 110, 110), 1f) { DashStyle = DashStyle.Dash };
            center = NewFormat(StringAlignment.Center);
            right = NewFormat(StringAlignment.Far);
            left = NewFormat(StringAlignment.Near);
        }

        private static Font CreateFont(string name, float size, FontStyle style)
        {
            try { return new Font(name, size, style, GraphicsUnit.Point); }
            catch { return new Font(FontFamily.GenericSansSerif, size, style, GraphicsUnit.Point); }
        }

        private static StringFormat NewFormat(StringAlignment alignment)
        {
            return new StringFormat(StringFormat.GenericTypographic)
            {
                Alignment = alignment,
                LineAlignment = StringAlignment.Near,
                Trimming = StringTrimming.Word
            };
        }

        private static string Clean(string value)
        {
            return String.IsNullOrWhiteSpace(value) ? String.Empty : value.Trim();
        }

        private static List<string> SafeLines(List<string> values)
        {
            return values ?? new List<string>();
        }

        private static List<ReceiptRow> SafeRows(List<ReceiptRow> values)
        {
            return values ?? new List<ReceiptRow>();
        }

        private float Measure(Graphics graphics, string value, Font font, float width, StringFormat format)
        {
            string text = Clean(value);
            if (text.Length == 0) return 0f;
            SizeF size = graphics.MeasureString(text, font, new SizeF(Math.Max(1f, width), 10000f), format);
            return (float)Math.Ceiling(size.Height);
        }

        private float DrawCenteredLine(Graphics graphics, string value, Font font, float y, float gap, bool draw)
        {
            string text = Clean(value);
            if (text.Length == 0) return y;
            float width = PageWidth - (SideMargin * 2f);
            float height = Measure(graphics, text, font, width, center);
            if (draw) graphics.DrawString(text, font, Brushes.Black, new RectangleF(SideMargin, y, width, height + 2f), center);
            return y + height + gap;
        }

        private float DrawRule(Graphics graphics, float y, bool dashed, bool draw)
        {
            if (draw) graphics.DrawLine(dashed ? divider : hairline, SideMargin, y, PageWidth - SideMargin, y);
            return y + 13f;
        }

        private float DrawRow(Graphics graphics, ReceiptRow row, float y, bool draw, bool summaryRow)
        {
            if (row == null) return y;
            string label = Clean(row.Label);
            string value = Clean(row.Value);
            string detail = Clean(row.Detail);
            bool emphasis = row.Emphasis;
            Font labelFont = emphasis ? totalFont : (summaryRow ? regularFont : regularFont);
            Font valueFont = emphasis ? totalValueFont : regularFont;
            float contentWidth = PageWidth - (SideMargin * 2f);
            float valueWidth = emphasis ? 238f : (summaryRow ? 230f : 160f);
            float columnGap = 14f;
            float labelWidth = contentWidth - valueWidth - columnGap;
            float labelHeight = Measure(graphics, label, labelFont, labelWidth, left);
            float valueHeight = Measure(graphics, value, valueFont, valueWidth, right);
            float rowHeight = Math.Max(labelHeight, valueHeight);

            if (emphasis)
            {
                y = DrawRule(graphics, y + 2f, false, draw) + 2f;
            }

            if (draw)
            {
                graphics.DrawString(label, labelFont, Brushes.Black, new RectangleF(SideMargin, y, labelWidth, rowHeight + 2f), left);
                graphics.DrawString(value, valueFont, Brushes.Black, new RectangleF(PageWidth - SideMargin - valueWidth, y, valueWidth, rowHeight + 2f), right);
            }
            y += rowHeight;

            if (detail.Length > 0)
            {
                float detailHeight = Measure(graphics, detail, smallFont, labelWidth, left);
                if (draw) graphics.DrawString(detail, smallFont, Brushes.DimGray, new RectangleF(SideMargin, y + 1f, labelWidth, detailHeight + 2f), left);
                y += detailHeight + 2f;
            }
            return y + (emphasis ? 13f : 10f);
        }

        public float Render(Graphics graphics, ReceiptData receipt, bool draw)
        {
            if (receipt == null) throw new InvalidDataException("Receipt data is required.");
            graphics.PageUnit = GraphicsUnit.Pixel;
            graphics.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            graphics.SmoothingMode = SmoothingMode.HighQuality;
            float y = TopMargin;

            List<string> brand = SafeLines(receipt.Brand);
            if (brand.Count > 0) y = DrawCenteredLine(graphics, brand[0], brandFont, y, 5f, draw);
            if (brand.Count > 1) y = DrawCenteredLine(graphics, brand[1], brandSubFont, y, 18f, draw);
            y = DrawCenteredLine(graphics, Clean(receipt.Title).Length > 0 ? receipt.Title : "領 収 書", titleFont, y, 24f, draw);

            foreach (ReceiptRow row in SafeRows(receipt.Meta)) y = DrawRow(graphics, row, y, draw, true) - 4f;
            y = DrawRule(graphics, y + 5f, true, draw);

            foreach (ReceiptRow row in SafeRows(receipt.Items)) y = DrawRow(graphics, row, y, draw, false);
            y = DrawRule(graphics, y + 1f, true, draw);

            foreach (ReceiptRow row in SafeRows(receipt.Summary)) y = DrawRow(graphics, row, y, draw, true);
            string tax = Clean(receipt.Tax);
            if (tax.Length > 0)
            {
                float width = PageWidth - (SideMargin * 2f);
                float height = Measure(graphics, tax, smallFont, width, right);
                if (draw) graphics.DrawString(tax, smallFont, Brushes.DimGray, new RectangleF(SideMargin, y, width, height + 2f), right);
                y += height + 16f;
            }
            if (receipt.Payment != null) y = DrawRow(graphics, receipt.Payment, y, draw, true);

            y += 8f;
            foreach (string line in SafeLines(receipt.Message)) y = DrawCenteredLine(graphics, line, smallFont, y, 2f, draw);
            y = DrawRule(graphics, y + 17f, false, draw) + 2f;

            List<string> store = SafeLines(receipt.Store);
            for (int index = 0; index < store.Count; index++)
            {
                y = DrawCenteredLine(graphics, store[index], index == 0 ? footerBoldFont : smallFont, y, 2f, draw);
            }
            return (float)Math.Ceiling(y + BottomFeed);
        }

        public float MeasureHeight(ReceiptData receipt)
        {
            using (Bitmap scratch = new Bitmap(2, 2))
            {
                scratch.SetResolution(TargetDpi, TargetDpi);
                using (Graphics graphics = Graphics.FromImage(scratch))
                {
                    graphics.PageUnit = GraphicsUnit.Pixel;
                    return Render(graphics, receipt, false);
                }
            }
        }

        public void RenderPreview(ReceiptData receipt, string outputPath)
        {
            int height = (int)Math.Ceiling(MeasureHeight(receipt));
            using (Bitmap bitmap = new Bitmap((int)PageWidth, height))
            {
                bitmap.SetResolution(TargetDpi, TargetDpi);
                using (Graphics graphics = Graphics.FromImage(bitmap))
                {
                    graphics.Clear(Color.White);
                    Render(graphics, receipt, true);
                    bitmap.Save(outputPath, System.Drawing.Imaging.ImageFormat.Png);
                }
            }
        }

        public static float PixelsToMillimeters(float pixels)
        {
            return pixels * 25.4f / TargetDpi;
        }

        public static int PixelsToHundredthsOfInch(float pixels)
        {
            return Math.Max(40, (int)Math.Ceiling(pixels * 100f / TargetDpi));
        }

        public void Dispose()
        {
            brandFont.Dispose();
            brandSubFont.Dispose();
            titleFont.Dispose();
            regularFont.Dispose();
            regularBoldFont.Dispose();
            smallFont.Dispose();
            totalFont.Dispose();
            totalValueFont.Dispose();
            footerBoldFont.Dispose();
            hairline.Dispose();
            divider.Dispose();
            center.Dispose();
            right.Dispose();
            left.Dispose();
        }
    }

    internal static class Program
    {
        private const string Version = "v583";
        private const int MaxHeaderBytes = 32768;
        private const int MaxBodyBytes = 262144;
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = MaxBodyBytes };
        private static readonly string AppDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ORIMIA Print Bridge");
        private static readonly string ConfigPath = Path.Combine(AppDirectory, "config.json");
        private static readonly string LogPath = Path.Combine(AppDirectory, "bridge.log");

        [STAThread]
        private static int Main(string[] args)
        {
            Directory.CreateDirectory(AppDirectory);
            BridgeConfig config = LoadConfig();
            if (args.Length > 0 && String.Equals(args[0], "--self-test", StringComparison.OrdinalIgnoreCase))
            {
                return RunSelfTest();
            }

            bool created;
            using (Mutex mutex = new Mutex(true, "Local\\ORIMIA_POS_PRINT_BRIDGE_V583", out created))
            {
                if (!created) return 0;
                try
                {
                    RunServer(config);
                    return 0;
                }
                catch (Exception error)
                {
                    Log("fatal: " + error);
                    return 1;
                }
            }
        }

        private static BridgeConfig LoadConfig()
        {
            BridgeConfig fallback = new BridgeConfig { PrinterName = "POS-80C", Port = 17615 };
            try
            {
                if (!File.Exists(ConfigPath)) return fallback;
                BridgeConfig loaded = Json.Deserialize<BridgeConfig>(File.ReadAllText(ConfigPath, Encoding.UTF8));
                if (loaded == null) return fallback;
                if (String.IsNullOrWhiteSpace(loaded.PrinterName)) loaded.PrinterName = fallback.PrinterName;
                if (loaded.Port < 1024 || loaded.Port > 65535) loaded.Port = fallback.Port;
                return loaded;
            }
            catch (Exception error)
            {
                Log("config: " + error.Message);
                return fallback;
            }
        }

        private static void RunServer(BridgeConfig config)
        {
            TcpListener listener = new TcpListener(IPAddress.Loopback, config.Port);
            listener.Start(8);
            Log("started " + Version + " on 127.0.0.1:" + config.Port + " for " + config.PrinterName);
            try
            {
                while (true)
                {
                    TcpClient client = listener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(delegate { HandleClient(client, config); });
                }
            }
            finally
            {
                listener.Stop();
            }
        }

        private static void HandleClient(TcpClient client, BridgeConfig config)
        {
            using (client)
            {
                client.ReceiveTimeout = 15000;
                client.SendTimeout = 15000;
                NetworkStream stream = client.GetStream();
                try
                {
                    ParsedRequest request = ReadRequest(stream);
                    string origin = Header(request, "Origin");
                    bool allowedOrigin = IsAllowedOrigin(origin);

                    if (String.Equals(request.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
                    {
                        if (!allowedOrigin) { WriteJson(stream, 403, origin, new { error = "origin_not_allowed" }); return; }
                        WriteResponse(stream, 204, origin, new byte[0], "application/json; charset=utf-8");
                        return;
                    }

                    if (request.Method == "GET" && request.Path == "/status")
                    {
                        bool installed = IsPrinterInstalled(config.PrinterName);
                        WriteJson(stream, 200, allowedOrigin ? origin : null, new
                        {
                            version = Version,
                            available = installed,
                            printerName = config.PrinterName,
                            transport = "windows-local-bridge",
                            dpi = ReceiptRenderer.TargetDpi,
                            rollWidthMm = ReceiptRenderer.RollWidthMm,
                            printableWidthMm = ReceiptRenderer.PrintableWidthMm
                        });
                        return;
                    }

                    if (!allowedOrigin) { WriteJson(stream, 403, null, new { error = "origin_not_allowed" }); return; }
                    if (request.Method != "POST" || request.Path != "/print") { WriteJson(stream, 404, origin, new { error = "not_found" }); return; }
                    if (!IsPrinterInstalled(config.PrinterName)) { WriteJson(stream, 409, origin, new { error = "printer_not_available" }); return; }

                    PrintRequest printRequest = Json.Deserialize<PrintRequest>(Encoding.UTF8.GetString(request.Body));
                    Validate(printRequest);
                    float heightPixels;
                    using (ReceiptRenderer renderer = new ReceiptRenderer())
                    {
                        heightPixels = renderer.MeasureHeight(printRequest.Receipt);
                        if (!printRequest.DryRun) PrintReceipt(config.PrinterName, printRequest.Receipt, renderer, heightPixels);
                    }
                    float heightMm = (float)Math.Round(ReceiptRenderer.PixelsToMillimeters(heightPixels), 2);
                    Log((printRequest.DryRun ? "measured" : "printed") + " " + heightMm + "mm on " + config.PrinterName);
                    WriteJson(stream, 200, origin, new
                    {
                        version = Version,
                        printed = !printRequest.DryRun,
                        dryRun = printRequest.DryRun,
                        printerName = config.PrinterName,
                        heightMm = heightMm,
                        dpi = ReceiptRenderer.TargetDpi,
                        rollWidthMm = ReceiptRenderer.RollWidthMm
                    });
                }
                catch (InvalidDataException error)
                {
                    WriteJson(stream, 400, null, new { error = "invalid_request", detail = error.Message });
                }
                catch (Exception error)
                {
                    Log("request: " + error);
                    try { WriteJson(stream, 500, null, new { error = "print_failed" }); }
                    catch { }
                }
            }
        }

        private static void PrintReceipt(string printerName, ReceiptData receipt, ReceiptRenderer renderer, float heightPixels)
        {
            using (PrintDocument document = new PrintDocument())
            {
                document.DocumentName = "ORIMIA Receipt";
                document.PrintController = new StandardPrintController();
                document.PrinterSettings.PrinterName = printerName;
                if (!document.PrinterSettings.IsValid) throw new InvalidOperationException("Printer is not available.");
                PrinterResolution resolution = document.DefaultPageSettings.PrinterResolution;
                if (resolution.X != (int)ReceiptRenderer.TargetDpi || resolution.Y != (int)ReceiptRenderer.TargetDpi)
                {
                    throw new InvalidOperationException("POS-80C must use 203 dpi resolution.");
                }
                document.OriginAtMargins = false;
                document.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
                document.DefaultPageSettings.PaperSize = new PaperSize(
                    "ORIMIA Receipt",
                    284,
                    ReceiptRenderer.PixelsToHundredthsOfInch(heightPixels)
                );
                document.PrintPage += delegate(object sender, PrintPageEventArgs args)
                {
                    args.Graphics.PageUnit = GraphicsUnit.Pixel;
                    renderer.Render(args.Graphics, receipt, true);
                    args.HasMorePages = false;
                };
                document.Print();
            }
        }

        private static void Validate(PrintRequest request)
        {
            if (request == null || request.Version != 1 || request.Receipt == null) throw new InvalidDataException("Unsupported receipt payload.");
            if (request.Receipt.Meta != null && request.Receipt.Meta.Count > 24) throw new InvalidDataException("Too many metadata rows.");
            if (request.Receipt.Items != null && request.Receipt.Items.Count > 100) throw new InvalidDataException("Too many receipt items.");
            if (request.Receipt.Summary != null && request.Receipt.Summary.Count > 24) throw new InvalidDataException("Too many summary rows.");
        }

        private static bool IsPrinterInstalled(string printerName)
        {
            foreach (string installed in PrinterSettings.InstalledPrinters)
            {
                if (String.Equals(installed, printerName, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        private static bool IsAllowedOrigin(string origin)
        {
            if (String.IsNullOrWhiteSpace(origin)) return false;
            Uri uri;
            if (!Uri.TryCreate(origin, UriKind.Absolute, out uri)) return false;
            if (uri.Scheme == "https" && (uri.Host == "salon-de-lien.com" || uri.Host == "www.salon-de-lien.com")) return true;
            return uri.Scheme == "http" && (uri.Host == "127.0.0.1" || uri.Host == "localhost");
        }

        private static ParsedRequest ReadRequest(NetworkStream stream)
        {
            List<byte> bytes = new List<byte>();
            byte[] buffer = new byte[4096];
            int headerEnd = -1;
            while (headerEnd < 0)
            {
                int read = stream.Read(buffer, 0, buffer.Length);
                if (read <= 0) throw new InvalidDataException("Request ended before headers.");
                for (int index = 0; index < read; index++) bytes.Add(buffer[index]);
                if (bytes.Count > MaxHeaderBytes) throw new InvalidDataException("Request headers are too large.");
                headerEnd = FindHeaderEnd(bytes);
            }

            byte[] all = bytes.ToArray();
            string headerText = Encoding.ASCII.GetString(all, 0, headerEnd);
            string[] lines = headerText.Split(new[] { "\r\n" }, StringSplitOptions.None);
            string[] requestLine = lines[0].Split(' ');
            if (requestLine.Length < 2) throw new InvalidDataException("Malformed request line.");
            Dictionary<string, string> headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int index = 1; index < lines.Length; index++)
            {
                int separator = lines[index].IndexOf(':');
                if (separator <= 0) continue;
                headers[lines[index].Substring(0, separator).Trim()] = lines[index].Substring(separator + 1).Trim();
            }

            int contentLength = 0;
            string lengthValue;
            if (headers.TryGetValue("Content-Length", out lengthValue) && !Int32.TryParse(lengthValue, out contentLength)) throw new InvalidDataException("Invalid content length.");
            if (contentLength < 0 || contentLength > MaxBodyBytes) throw new InvalidDataException("Request body is too large.");
            byte[] body = new byte[contentLength];
            int bufferedBody = Math.Min(contentLength, all.Length - (headerEnd + 4));
            if (bufferedBody > 0) Buffer.BlockCopy(all, headerEnd + 4, body, 0, bufferedBody);
            int offset = bufferedBody;
            while (offset < contentLength)
            {
                int read = stream.Read(body, offset, contentLength - offset);
                if (read <= 0) throw new InvalidDataException("Request body ended early.");
                offset += read;
            }
            string path = requestLine[1].Split('?')[0];
            return new ParsedRequest { Method = requestLine[0].ToUpperInvariant(), Path = path, Headers = headers, Body = body };
        }

        private static int FindHeaderEnd(List<byte> bytes)
        {
            for (int index = Math.Max(0, bytes.Count - 4099); index <= bytes.Count - 4; index++)
            {
                if (bytes[index] == 13 && bytes[index + 1] == 10 && bytes[index + 2] == 13 && bytes[index + 3] == 10) return index;
            }
            return -1;
        }

        private static string Header(ParsedRequest request, string name)
        {
            string value;
            return request.Headers.TryGetValue(name, out value) ? value : null;
        }

        private static void WriteJson(NetworkStream stream, int status, string origin, object value)
        {
            WriteResponse(stream, status, origin, Encoding.UTF8.GetBytes(Json.Serialize(value)), "application/json; charset=utf-8");
        }

        private static void WriteResponse(NetworkStream stream, int status, string origin, byte[] body, string contentType)
        {
            string reason = status == 200 ? "OK" : status == 204 ? "No Content" : status == 400 ? "Bad Request" : status == 403 ? "Forbidden" : status == 404 ? "Not Found" : status == 409 ? "Conflict" : "Internal Server Error";
            StringBuilder headers = new StringBuilder();
            headers.Append("HTTP/1.1 ").Append(status).Append(' ').Append(reason).Append("\r\n");
            headers.Append("Content-Type: ").Append(contentType).Append("\r\n");
            headers.Append("Content-Length: ").Append(body.Length).Append("\r\n");
            headers.Append("Cache-Control: no-store\r\nConnection: close\r\n");
            if (!String.IsNullOrWhiteSpace(origin))
            {
                headers.Append("Access-Control-Allow-Origin: ").Append(origin).Append("\r\n");
                headers.Append("Vary: Origin\r\n");
                headers.Append("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n");
                headers.Append("Access-Control-Allow-Headers: Content-Type\r\n");
                headers.Append("Access-Control-Allow-Private-Network: true\r\n");
            }
            headers.Append("\r\n");
            byte[] headerBytes = Encoding.ASCII.GetBytes(headers.ToString());
            stream.Write(headerBytes, 0, headerBytes.Length);
            if (body.Length > 0) stream.Write(body, 0, body.Length);
            stream.Flush();
        }

        private static int RunSelfTest()
        {
            try
            {
                ReceiptData receipt = new ReceiptData
                {
                    Brand = new List<string> { "ヘアサロン ハレルヤ", "ORIMIA for Salon" },
                    Title = "領 収 書",
                    Meta = new List<ReceiptRow>
                    {
                        new ReceiptRow { Label = "発行日時", Value = "2026/09/08 12:00" },
                        new ReceiptRow { Label = "お客様", Value = "テスト 様" }
                    },
                    Items = new List<ReceiptRow> { new ReceiptRow { Label = "髪質ケアトリートメント", Detail = "施術", Value = "5,500円" } },
                    Summary = new List<ReceiptRow>
                    {
                        new ReceiptRow { Label = "小計", Value = "5,500円" },
                        new ReceiptRow { Label = "合計", Value = "5,500円", Emphasis = true }
                    },
                    Tax = "（うち消費税10% 500円）",
                    Payment = new ReceiptRow { Label = "お支払い", Value = "現金" },
                    Message = new List<string> { "上記正に領収いたしました。", "ご来店ありがとうございました。" },
                    Store = new List<string> { "ORIMIA for Salon", "岡山県岡山市北区駅前町1-1-118", "岡山駅徒歩3分 / イコットニコット手前", "10:00〜19:00" }
                };
                string preview = Path.Combine(AppDirectory, "self-test.png");
                float height;
                using (ReceiptRenderer renderer = new ReceiptRenderer())
                {
                    height = renderer.MeasureHeight(receipt);
                    renderer.RenderPreview(receipt, preview);
                }
                File.WriteAllText(Path.Combine(AppDirectory, "self-test.json"), Json.Serialize(new
                {
                    version = Version,
                    dpi = ReceiptRenderer.TargetDpi,
                    rollWidthMm = ReceiptRenderer.RollWidthMm,
                    printableWidthMm = ReceiptRenderer.PrintableWidthMm,
                    widthPx = 576,
                    heightPx = (int)Math.Ceiling(height),
                    heightMm = Math.Round(ReceiptRenderer.PixelsToMillimeters(height), 2),
                    preview = preview
                }), Encoding.UTF8);
                return 0;
            }
            catch (Exception error)
            {
                Log("self-test: " + error);
                return 1;
            }
        }

        private static void Log(string message)
        {
            try
            {
                Directory.CreateDirectory(AppDirectory);
                File.AppendAllText(LogPath, DateTimeOffset.Now.ToString("o") + " " + message + Environment.NewLine, Encoding.UTF8);
            }
            catch { }
        }
    }
}
