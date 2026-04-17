// Agent control overlay: glowing screen border + cursor highlight ring
// + two-pill cursor label (name + optional live description).
// Launched as a subprocess, stays alive until killed (SIGTERM/SIGINT)
// or stdin is closed. Accepts line-based commands on stdin:
//   desc <utf8-text>\n   — update description pill (empty hides it)
//   quit\n               — graceful fade-out
// Usage: xcrun swift agent-overlay.swift [--color RRGGBB] [--label TEXT]

import AppKit

let BORDER_CORE_WIDTH: CGFloat = 3.5
let CURSOR_RING_SIZE: CGFloat = 40.0
let CURSOR_POLL_INTERVAL: TimeInterval = 1.0 / 30.0
let FADE_IN_DURATION: TimeInterval = 0.4
let FADE_OUT_DURATION: TimeInterval = 0.35

// Breathing pulse: alpha oscillates between these bounds
let PULSE_MIN_ALPHA: CGFloat = 0.55
let PULSE_MAX_ALPHA: CGFloat = 1.0
let PULSE_PERIOD: TimeInterval = 2.0

// Layout for the pill stack (name + description)
let PILL_STACK_SPACING: CGFloat = 4.0
let PILL_CURSOR_OFFSET_X: CGFloat = 6.0
let PILL_CURSOR_OFFSET_Y: CGFloat = 8.0

var overlayR: CGFloat = 0.682
var overlayG: CGFloat = 1.0
var overlayB: CGFloat = 0.0

var overlayLabelText: String = "Atomic bot"

func parseArgs() {
    let args = CommandLine.arguments
    if let idx = args.firstIndex(of: "--color"), idx + 1 < args.count {
        let hex = args[idx + 1]
        if hex.count == 6,
           let r = UInt8(hex.prefix(2), radix: 16),
           let g = UInt8(hex.dropFirst(2).prefix(2), radix: 16),
           let b = UInt8(hex.dropFirst(4).prefix(2), radix: 16)
        {
            overlayR = CGFloat(r) / 255.0
            overlayG = CGFloat(g) / 255.0
            overlayB = CGFloat(b) / 255.0
        }
    }
    if let idx = args.firstIndex(of: "--label"), idx + 1 < args.count {
        overlayLabelText = args[idx + 1]
    }
}

// ── Glow border view ─────────────────────────────────────────
// Draws multiple concentric strokes with decreasing alpha
// to simulate a soft outer glow around the screen edge.

final class GlowBorderView: NSView {
    override var wantsLayer: Bool { get { true } set {} }

    private static let layerCount = 36
    private static let maxWidth: CGFloat = 38.0

    override func draw(_ dirtyRect: NSRect) {
        NSColor.clear.setFill()
        dirtyRect.fill()

        let count = GlowBorderView.layerCount
        for i in 0..<count {
            let t = CGFloat(i) / CGFloat(count - 1) // 0 (outermost) → 1 (innermost)
            let width = GlowBorderView.maxWidth * (1.0 - t) + BORDER_CORE_WIDTH
            let alpha = 0.03 + 0.85 * pow(t, 2.2)

            let color = NSColor(red: overlayR, green: overlayG, blue: overlayB, alpha: alpha)
            color.setStroke()
            let inset = width / 2.0
            let path = NSBezierPath(rect: bounds.insetBy(dx: inset, dy: inset))
            path.lineWidth = 1.2
            path.stroke()
        }
    }
}

// ── Pill view (reused for name and description) ──────────────
// Self-sizing rounded-pill with centered text. Exposes preferredSize()
// that recomputes from the current text so the stack can resize.

final class PillView: NSView {
    override var wantsLayer: Bool { get { true } set {} }
    override var isFlipped: Bool { false }

    static let fontSize: CGFloat = 11.0
    static let paddingH: CGFloat = 8.0
    static let paddingV: CGFloat = 3.0
    static let cornerRadius: CGFloat = 4.0
    static let outerInset: CGFloat = 1.0

    var text: String {
        didSet {
            invalidateIntrinsicContentSize()
            needsDisplay = true
        }
    }

    init(text: String) {
        self.text = text
        super.init(frame: .zero)
        wantsLayer = true
        translatesAutoresizingMaskIntoConstraints = false
    }

    required init?(coder: NSCoder) { fatalError("not supported") }

    private var textAttrs: [NSAttributedString.Key: Any] {
        [
            .font: NSFont.systemFont(ofSize: PillView.fontSize, weight: .medium),
            .foregroundColor: NSColor.black,
        ]
    }

    override var intrinsicContentSize: NSSize {
        let size = (text as NSString).size(withAttributes: textAttrs)
        return NSSize(
            width: ceil(size.width) + PillView.paddingH * 2 + PillView.outerInset * 2,
            height: ceil(size.height) + PillView.paddingV * 2 + PillView.outerInset * 2
        )
    }

    override func draw(_ dirtyRect: NSRect) {
        NSColor.clear.setFill()
        dirtyRect.fill()

        let bgColor = NSColor(red: overlayR, green: overlayG, blue: overlayB, alpha: 1.0)
        let pill = NSBezierPath(
            roundedRect: bounds.insetBy(dx: PillView.outerInset, dy: PillView.outerInset),
            xRadius: PillView.cornerRadius,
            yRadius: PillView.cornerRadius
        )
        bgColor.setFill()
        pill.fill()

        let str = NSAttributedString(string: text, attributes: textAttrs)
        let size = str.size()
        let origin = NSPoint(
            x: (bounds.width - size.width) / 2.0,
            y: (bounds.height - size.height) / 2.0
        )
        str.draw(at: origin)
    }
}

// ── Glow cursor ring view ────────────────────────────────────

final class GlowCursorRingView: NSView {
    override var wantsLayer: Bool { get { true } set {} }

    private static let layerCount = 14
    private static let maxSpread: CGFloat = 10.0

    override func draw(_ dirtyRect: NSRect) {
        NSColor.clear.setFill()
        dirtyRect.fill()

        let count = GlowCursorRingView.layerCount
        for i in 0..<count {
            let t = CGFloat(i) / CGFloat(count - 1)
            let spread = GlowCursorRingView.maxSpread * (1.0 - t)
            let alpha = 0.04 + 0.76 * pow(t, 2.0)

            let color = NSColor(red: overlayR, green: overlayG, blue: overlayB, alpha: alpha)
            color.setStroke()
            let inset = spread + 3.0
            let circle = NSBezierPath(ovalIn: bounds.insetBy(dx: inset, dy: inset))
            circle.lineWidth = 1.2
            circle.stroke()
        }
    }
}

// ── Main ─────────────────────────────────────────────────────

parseArgs()

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

guard let screen = NSScreen.main else {
    fputs("No main screen available\n", stderr)
    exit(1)
}

let frame = screen.frame
let maxLevel = NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.maximumWindow)))

let borderWindow = NSWindow(
    contentRect: frame,
    styleMask: .borderless,
    backing: .buffered,
    defer: false
)
borderWindow.level = maxLevel
borderWindow.backgroundColor = .clear
borderWindow.isOpaque = false
borderWindow.hasShadow = false
borderWindow.ignoresMouseEvents = true
borderWindow.collectionBehavior = [.canJoinAllSpaces, .stationary]
borderWindow.contentView = GlowBorderView(frame: frame)
borderWindow.contentView?.wantsLayer = true
borderWindow.alphaValue = 0
borderWindow.orderFrontRegardless()

let cursorWindow = NSWindow(
    contentRect: NSRect(x: 0, y: 0, width: CURSOR_RING_SIZE, height: CURSOR_RING_SIZE),
    styleMask: .borderless,
    backing: .buffered,
    defer: false
)
cursorWindow.level = maxLevel
cursorWindow.backgroundColor = .clear
cursorWindow.isOpaque = false
cursorWindow.hasShadow = false
cursorWindow.ignoresMouseEvents = true
cursorWindow.collectionBehavior = [.canJoinAllSpaces, .stationary]
cursorWindow.contentView = GlowCursorRingView(
    frame: NSRect(x: 0, y: 0, width: CURSOR_RING_SIZE, height: CURSOR_RING_SIZE)
)
cursorWindow.contentView?.wantsLayer = true
cursorWindow.alphaValue = 0

// ── Cursor label window (name + optional description, stacked) ───────

let namePill = PillView(text: overlayLabelText)
let descPill = PillView(text: "")
descPill.isHidden = true

let stack = NSStackView(views: [namePill, descPill])
stack.orientation = .vertical
stack.alignment = .leading
stack.spacing = PILL_STACK_SPACING
stack.translatesAutoresizingMaskIntoConstraints = false
stack.wantsLayer = true

func stackFittingSize() -> NSSize {
    // Sum of visible pill intrinsic sizes + spacing. Using fittingSize on the
    // stack can return stale values right after toggling isHidden, so compute
    // it manually from the children.
    var width: CGFloat = 0
    var height: CGFloat = 0
    var visibleCount = 0
    for case let pill as PillView in stack.arrangedSubviews where !pill.isHidden {
        let s = pill.intrinsicContentSize
        width = max(width, s.width)
        height += s.height
        visibleCount += 1
    }
    if visibleCount > 1 {
        height += PILL_STACK_SPACING * CGFloat(visibleCount - 1)
    }
    return NSSize(width: max(1, width), height: max(1, height))
}

let initialSize = stackFittingSize()
let labelWindow = NSWindow(
    contentRect: NSRect(x: 0, y: 0, width: initialSize.width, height: initialSize.height),
    styleMask: .borderless,
    backing: .buffered,
    defer: false
)
labelWindow.level = maxLevel
labelWindow.backgroundColor = .clear
labelWindow.isOpaque = false
labelWindow.hasShadow = false
labelWindow.ignoresMouseEvents = true
labelWindow.collectionBehavior = [.canJoinAllSpaces, .stationary]

// Use the stack itself as the window's content view. Its translatesAutoresizingMaskIntoConstraints
// is flipped back on here so the window can freely resize it via setFrame. Pills inside the stack
// keep their own intrinsic sizes; the window is sized to exactly match stackFittingSize().
stack.translatesAutoresizingMaskIntoConstraints = true
stack.autoresizingMask = [.width, .height]
stack.frame = NSRect(origin: .zero, size: initialSize)
labelWindow.contentView = stack
labelWindow.alphaValue = 0

func resizeLabelWindow() {
    let s = stackFittingSize()
    var frame = labelWindow.frame
    frame.size = s
    labelWindow.setFrame(frame, display: true)
}

// ── Fade in ──────────────────────────────────────────────────

NSAnimationContext.runAnimationGroup { ctx in
    ctx.duration = FADE_IN_DURATION
    ctx.timingFunction = CAMediaTimingFunction(name: .easeOut)
    borderWindow.animator().alphaValue = 1.0
    cursorWindow.animator().alphaValue = 1.0
    labelWindow.animator().alphaValue = 1.0
}

// ── Breathing pulse ─────────────────────────────────────────

var pulseTerminating = false
let pulseStart = CFAbsoluteTimeGetCurrent()

Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { timer in
    if pulseTerminating { timer.invalidate(); return }
    let elapsed = CFAbsoluteTimeGetCurrent() - pulseStart
    let t = (1.0 + sin(2.0 * .pi * elapsed / PULSE_PERIOD - .pi / 2.0)) / 2.0
    let alpha = PULSE_MIN_ALPHA + (PULSE_MAX_ALPHA - PULSE_MIN_ALPHA) * CGFloat(t)
    DispatchQueue.main.async {
        borderWindow.alphaValue = alpha
        cursorWindow.alphaValue = alpha
        labelWindow.alphaValue = alpha
    }
}

// ── Cursor tracking ──────────────────────────────────────────

Timer.scheduledTimer(withTimeInterval: CURSOR_POLL_INTERVAL, repeats: true) { _ in
    DispatchQueue.main.async {
        let pos = NSEvent.mouseLocation
        cursorWindow.setFrameOrigin(NSPoint(
            x: pos.x - CURSOR_RING_SIZE / 2.0,
            y: pos.y - CURSOR_RING_SIZE / 2.0
        ))
        cursorWindow.orderFrontRegardless()

        let winHeight = labelWindow.frame.size.height
        labelWindow.setFrameOrigin(NSPoint(
            x: pos.x + PILL_CURSOR_OFFSET_X,
            y: pos.y - winHeight - PILL_CURSOR_OFFSET_Y
        ))
        labelWindow.orderFrontRegardless()
    }
}

// ── Graceful fade-out on termination ─────────────────────────

func gracefulFadeOut() {
    if pulseTerminating { return }
    pulseTerminating = true
    NSAnimationContext.runAnimationGroup({ ctx in
        ctx.duration = FADE_OUT_DURATION
        ctx.timingFunction = CAMediaTimingFunction(name: .easeIn)
        borderWindow.animator().alphaValue = 0
        cursorWindow.animator().alphaValue = 0
        labelWindow.animator().alphaValue = 0
    }, completionHandler: {
        exit(0)
    })
}

// ── Stdin protocol reader ─────────────────────────────────────
// Line-based. `desc <text>\n` sets description pill text (empty hides it).
// `quit\n` triggers graceful fade-out. Pipe close also triggers fade-out.

func applyDescription(_ text: String) {
    descPill.text = text
    descPill.isHidden = text.isEmpty
    resizeLabelWindow()
}

func handleStdinLine(_ raw: String) {
    let line = raw
    if line == "quit" {
        DispatchQueue.main.async { gracefulFadeOut() }
        return
    }
    if line.hasPrefix("desc ") {
        let text = String(line.dropFirst("desc ".count))
        DispatchQueue.main.async { applyDescription(text) }
        return
    }
    if line == "desc" {
        DispatchQueue.main.async { applyDescription("") }
        return
    }
    // Unknown lines: ignored on purpose to keep protocol forward-compatible.
}

let stdinHandle = FileHandle.standardInput
let stdinQueue = DispatchQueue(label: "agent-overlay.stdin", qos: .utility)
stdinQueue.async {
    var buffer = Data()
    while true {
        let chunk = stdinHandle.availableData
        if chunk.isEmpty {
            DispatchQueue.main.async { gracefulFadeOut() }
            return
        }
        buffer.append(chunk)
        while let nlIdx = buffer.firstIndex(of: 0x0A) {
            let lineData = buffer.subdata(in: 0..<nlIdx)
            buffer.removeSubrange(0...nlIdx)
            if let line = String(data: lineData, encoding: .utf8) {
                let trimmed = line.hasSuffix("\r") ? String(line.dropLast()) : line
                handleStdinLine(trimmed)
            }
        }
    }
}

let sigTermSource = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
signal(SIGTERM, SIG_IGN)
sigTermSource.setEventHandler { gracefulFadeOut() }
sigTermSource.resume()

let sigIntSource = DispatchSource.makeSignalSource(signal: SIGINT, queue: .main)
signal(SIGINT, SIG_IGN)
sigIntSource.setEventHandler { gracefulFadeOut() }
sigIntSource.resume()

app.run()
