from pathlib import Path
from PIL import Image, ImageDraw

for size in (192, 512):
    image = Image.new('RGB', (size, size), '#101625')
    draw = ImageDraw.Draw(image)
    unit = size / 192
    def box(coords):
        return tuple(round(value * unit) for value in coords)
    draw.rounded_rectangle(box((0, 0, 191, 191)), radius=round(42 * unit), fill='#101625')
    draw.rounded_rectangle(box((43, 45, 149, 147)), radius=round(20 * unit), fill='#747aff')
    draw.rounded_rectangle(box((55, 58, 137, 135)), radius=round(10 * unit), fill='#101625')
    width = round(8 * unit)
    draw.line([box((79, 79))[:2], box((66, 96))[:2], box((79, 113))[:2]], fill='white', width=width, joint='curve')
    draw.line([box((113, 79))[:2], box((126, 96))[:2], box((113, 113))[:2]], fill='white', width=width, joint='curve')
    draw.line([box((104, 75))[:2], box((88, 117))[:2]], fill='white', width=width)
    image.save(Path('public') / f'icon-{size}.png')
