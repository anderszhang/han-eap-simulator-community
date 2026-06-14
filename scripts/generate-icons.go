package main

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"math"
	"os"
	"path/filepath"
)

type canvas struct {
	img *image.RGBA
	s   int
}

func main() {
	root := filepath.Join("public")
	must(writePNG(filepath.Join(root, "icon-512.png"), 512))
	must(writePNG(filepath.Join(root, "icon-maskable.png"), 512))
	must(writePNG(filepath.Join(root, "apple-touch-icon.png"), 180))
	must(writePNG(filepath.Join(root, "favicon-32x32.png"), 32))
	must(writeICO(filepath.Join(root, "favicon.ico"), 32))
}

func writePNG(path string, size int) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return png.Encode(f, render(size))
}

func writeICO(path string, size int) error {
	var buf bytes.Buffer
	if err := png.Encode(&buf, render(size)); err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	if err := binary.Write(f, binary.LittleEndian, uint16(0)); err != nil {
		return err
	}
	if err := binary.Write(f, binary.LittleEndian, uint16(1)); err != nil {
		return err
	}
	if err := binary.Write(f, binary.LittleEndian, uint16(1)); err != nil {
		return err
	}
	entry := []byte{byte(size), byte(size), 0, 0}
	if _, err := f.Write(entry); err != nil {
		return err
	}
	if err := binary.Write(f, binary.LittleEndian, uint16(1)); err != nil {
		return err
	}
	if err := binary.Write(f, binary.LittleEndian, uint16(32)); err != nil {
		return err
	}
	if err := binary.Write(f, binary.LittleEndian, uint32(buf.Len())); err != nil {
		return err
	}
	if err := binary.Write(f, binary.LittleEndian, uint32(22)); err != nil {
		return err
	}
	_, err = f.Write(buf.Bytes())
	return err
}

func render(size int) image.Image {
	scale := 4
	c := canvas{
		img: image.NewRGBA(image.Rect(0, 0, 512*scale, 512*scale)),
		s:   scale,
	}
	draw.Draw(c.img, c.img.Bounds(), &image.Uniform{color.RGBA{238, 248, 246, 255}}, image.Point{}, draw.Src)
	c.roundRect(58, 58, 396, 396, 86, color.RGBA{12, 24, 34, 255})
	c.roundRectStroke(74, 74, 364, 364, 72, 5, color.RGBA{36, 70, 83, 255})

	dark := color.RGBA{13, 24, 34, 255}
	for _, x := range []float64{128, 184, 240, 296, 352, 408} {
		c.line(x, 36, x, 74, 13, dark)
		c.line(x, 438, x, 476, 13, dark)
	}
	for _, y := range []float64{128, 184, 240, 296, 352, 408} {
		c.line(36, y, 74, y, 13, dark)
		c.line(438, y, 476, y, 13, dark)
	}

	trace := color.RGBA{90, 240, 180, 255}
	glow := color.RGBA{115, 243, 255, 80}
	for _, stroke := range []struct {
		w   float64
		col color.RGBA
	}{
		{44, glow},
		{24, trace},
	} {
		c.line(118, 158, 118, 354, stroke.w, stroke.col)
		c.line(178, 158, 178, 354, stroke.w, stroke.col)
		c.line(118, 256, 178, 256, stroke.w, stroke.col)
		c.line(218, 354, 258, 158, stroke.w, stroke.col)
		c.line(298, 354, 258, 158, stroke.w, stroke.col)
		c.line(234, 276, 282, 276, stroke.w, stroke.col)
		c.line(334, 354, 334, 158, stroke.w, stroke.col)
		c.line(334, 158, 396, 354, stroke.w, stroke.col)
		c.line(396, 354, 396, 158, stroke.w, stroke.col)
	}

	light := color.RGBA{238, 248, 246, 255}
	for _, p := range [][2]float64{{118, 158}, {178, 354}, {258, 158}, {396, 354}} {
		c.circle(p[0], p[1], 9, light)
	}
	accent := color.RGBA{88, 240, 165, 255}
	for _, p := range [][3]float64{{256, 256, 8}, {86, 256, 6}, {426, 256, 6}} {
		c.circle(p[0], p[1], p[2], accent)
	}
	base := downsample(c.img, scale)
	if size == 512 {
		return base
	}
	return resize(base, size)
}

func (c canvas) roundRect(x, y, w, h, r float64, col color.RGBA) {
	c.fill(func(px, py float64) bool {
		return roundedContains(px, py, x, y, w, h, r)
	}, col)
}

func (c canvas) roundRectStroke(x, y, w, h, r, sw float64, col color.RGBA) {
	c.fill(func(px, py float64) bool {
		return roundedContains(px, py, x, y, w, h, r) && !roundedContains(px, py, x+sw, y+sw, w-2*sw, h-2*sw, r-sw)
	}, col)
}

func (c canvas) line(x1, y1, x2, y2, width float64, col color.RGBA) {
	r := width / 2
	c.fill(func(px, py float64) bool {
		return distToSegment(px, py, x1, y1, x2, y2) <= r
	}, col)
}

func (c canvas) circle(cx, cy, r float64, col color.RGBA) {
	c.fill(func(px, py float64) bool {
		return math.Hypot(px-cx, py-cy) <= r
	}, col)
}

func (c canvas) fill(contains func(float64, float64) bool, col color.RGBA) {
	b := c.img.Bounds()
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			if contains(float64(x)/float64(c.s), float64(y)/float64(c.s)) {
				c.img.SetRGBA(x, y, blend(c.img.RGBAAt(x, y), col))
			}
		}
	}
}

func roundedContains(px, py, x, y, w, h, r float64) bool {
	if px < x || py < y || px > x+w || py > y+h {
		return false
	}
	cx := math.Max(x+r, math.Min(px, x+w-r))
	cy := math.Max(y+r, math.Min(py, y+h-r))
	return math.Hypot(px-cx, py-cy) <= r
}

func distToSegment(px, py, x1, y1, x2, y2 float64) float64 {
	dx, dy := x2-x1, y2-y1
	if dx == 0 && dy == 0 {
		return math.Hypot(px-x1, py-y1)
	}
	t := ((px-x1)*dx + (py-y1)*dy) / (dx*dx + dy*dy)
	t = math.Max(0, math.Min(1, t))
	return math.Hypot(px-(x1+t*dx), py-(y1+t*dy))
}

func blend(dst, src color.RGBA) color.RGBA {
	a := float64(src.A) / 255
	return color.RGBA{
		R: uint8(float64(src.R)*a + float64(dst.R)*(1-a)),
		G: uint8(float64(src.G)*a + float64(dst.G)*(1-a)),
		B: uint8(float64(src.B)*a + float64(dst.B)*(1-a)),
		A: 255,
	}
}

func downsample(src *image.RGBA, scale int) *image.RGBA {
	dst := image.NewRGBA(image.Rect(0, 0, src.Bounds().Dx()/scale, src.Bounds().Dy()/scale))
	for y := 0; y < dst.Bounds().Dy(); y++ {
		for x := 0; x < dst.Bounds().Dx(); x++ {
			var r, g, b, a uint32
			for sy := 0; sy < scale; sy++ {
				for sx := 0; sx < scale; sx++ {
					c := src.RGBAAt(x*scale+sx, y*scale+sy)
					r += uint32(c.R)
					g += uint32(c.G)
					b += uint32(c.B)
					a += uint32(c.A)
				}
			}
			n := uint32(scale * scale)
			dst.SetRGBA(x, y, color.RGBA{uint8(r / n), uint8(g / n), uint8(b / n), uint8(a / n)})
		}
	}
	return dst
}

func resize(src *image.RGBA, size int) *image.RGBA {
	dst := image.NewRGBA(image.Rect(0, 0, size, size))
	srcSize := src.Bounds().Dx()
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			minX := x * srcSize / size
			maxX := (x + 1) * srcSize / size
			minY := y * srcSize / size
			maxY := (y + 1) * srcSize / size
			if maxX <= minX {
				maxX = minX + 1
			}
			if maxY <= minY {
				maxY = minY + 1
			}

			var r, g, b, a uint32
			var n uint32
			for sy := minY; sy < maxY; sy++ {
				for sx := minX; sx < maxX; sx++ {
					c := src.RGBAAt(sx, sy)
					r += uint32(c.R)
					g += uint32(c.G)
					b += uint32(c.B)
					a += uint32(c.A)
					n++
				}
			}
			dst.SetRGBA(x, y, color.RGBA{uint8(r / n), uint8(g / n), uint8(b / n), uint8(a / n)})
		}
	}
	return dst
}

func must(err error) {
	if err != nil {
		panic(err)
	}
}
