import os
import json
import re

CONFIG_PATH = 'website_config.json'

def load_config():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def update_html_files(config):
    brand_name = config.get('brand_name', 'Elhakim')
    title_brand_name = config.get('title_brand_name', 'Elhakim')
    phone_topbar = config.get('phone_topbar', '(+012) 1234 567890')
    phone_navbar = config.get('phone_navbar', '+0123 456 7890')
    phone_footer = config.get('phone_footer', '(+012) 3456 7890')
    address = config.get('address', '123 Street New York.USA')
    email_main = config.get('email_main', 'info@example.com')
    email_footer = config.get('email_footer', 'Yoursite@ex.com')
    use_image_logo = config.get('use_image_logo', True)

    # Get all html files in the directory
    html_files = [f for f in os.listdir('.') if f.endswith('.html')]

    for filename in html_files:
        print(f"Processing {filename}...")
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()

        # 1. Title, Keywords, and Description replacements
        content = re.sub(r'<title>.*?</title>', f'<title>{title_brand_name}</title>', content)
        content = re.sub(
            r'<meta content=".*?" name="keywords">',
            r'<meta content="Elhakim Store, Shein, Zara, perfumes, abaya, clothes, fashion, Egypt, Cairo" name="keywords">',
            content
        )
        content = re.sub(
            r'<meta content=".*?" name="description">',
            r'<meta content="Elhakim Store - Your premier destination for Shein & Zara fashion collections, elegant abayas, premium perfumes, and clothing. Quality you can trust." name="description">',
            content
        )

        # 2. Desktop Logo replacement
        # Find the desktop logo block and replace it
        desktop_logo_pattern = re.compile(
            r'(<a\s+href="[^"]*"\s+class="navbar-brand\s+p-0">)\s*<h1[^>]*>.*?</h1>\s*<!--\s*<img[^>]*>\s*-->\s*(</a>)',
            re.DOTALL
        )
        if use_image_logo:
            content = desktop_logo_pattern.sub(
                r'\1\n                        <img src="img/logo.jpg" alt="' + brand_name + r'" style="height: 55px; width: auto; object-fit: contain;">\n                    \2',
                content
            )
        else:
            # Just replace Electro with brand name in the h1 text
            content = re.sub(
                r'(<a\s+href="[^"]*"\s+class="navbar-brand\s+p-0">.*?class="[^"]*shopping-bag[^"]*"></i>)Electro(</h1>)',
                r'\1' + brand_name + r'\2',
                content,
                flags=re.DOTALL
            )

        # 3. Mobile Logo replacement
        mobile_logo_pattern = re.compile(
            r'(<a\s+href="[^"]*"\s+class="navbar-brand\s+d-block\s+d-lg-none">)\s*<h1[^>]*>.*?</h1>\s*<!--\s*<img[^>]*>\s*-->\s*(</a>)',
            re.DOTALL
        )
        if use_image_logo:
            content = mobile_logo_pattern.sub(
                r'\1\n                        <img src="img/logo.jpg" alt="' + brand_name + r'" style="height: 45px; width: auto; object-fit: contain;">\n                    \2',
                content
            )
        else:
            content = re.sub(
                r'(<a\s+href="[^"]*"\s+class="navbar-brand\s+d-block\s+d-lg-none">.*?class="[^"]*shopping-bag[^"]*"></i>)Electro(</h1>)',
                r'\1' + brand_name + r'\2',
                content,
                flags=re.DOTALL
            )

        # 4. Replace Your Site Name (Copyright text)
        content = re.sub(r'Your Site Name', brand_name, content)

        # 5. Contact info replacements
        # Call Us (Topbar): (+012) 1234 567890
        # Be careful to target the exact format
        content = re.sub(r'\(\+012\)\s*1234\s*567890', phone_topbar, content)

        # Call button (Navbar): +0123 456 7890
        content = re.sub(r'\+0123\s*456\s*7890', phone_navbar, content)

        # Telephone (Footer / contact page): (+012) 3456 7890
        content = re.sub(r'\(\+012\)\s*3456\s*7890', phone_footer, content)

        # Address: 123 Street New York.USA
        content = re.sub(r'123\s+Street\s+New\s+York\.USA', address, content)

        # Main email: info@example.com
        content = re.sub(r'info@example\.com', email_main, content)

        # Secondary email: Yoursite@ex.com
        content = re.sub(r'Yoursite@ex\.com', email_footer, content)

        # 6. Categories Menu replacement
        categories_html = """<ul class="list-unstyled categories-bars">
                                <li>
                                    <div class="categories-bars-item">
                                        <a href="shop.html?category=clothes">Clothes</a>
                                    </div>
                                </li>
                                <li>
                                    <div class="categories-bars-item">
                                        <a href="shop.html?category=perfumes">Perfumes</a>
                                    </div>
                                </li>
                                <li>
                                    <div class="categories-bars-item">
                                        <a href="shop.html?category=el-abayas">El Abayas</a>
                                    </div>
                                </li>
                                <li>
                                    <div class="categories-bars-item">
                                        <a href="shop.html?category=makeup">Makeup</a>
                                    </div>
                                </li>
                            </ul>"""
        content = re.sub(
            r'<ul class="list-unstyled categories-bars">.*?</ul>',
            categories_html,
            content,
            flags=re.DOTALL
        )

        # 7. Search dropdown replacement
        select_html = """<select class="form-select text-dark border-0 border-start rounded-0 p-3" style="width: 200px;" id="header-category-select" onchange="if(this.value != 'All Category') { window.location.href = 'shop.html?category=' + this.value; } else { window.location.href = 'shop.html'; }">
                            <option value="All Category">All Category</option>
                            <option value="clothes">Clothes</option>
                            <option value="perfumes">Perfumes</option>
                            <option value="el-abayas">El Abayas</option>
                            <option value="makeup">Makeup</option>
                        </select>"""
        content = re.sub(
            r'<select class="form-select text-dark border-0 border-start rounded-0 p-3".*?</select>',
            select_html,
            content,
            flags=re.DOTALL
        )

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)

    print("HTML files updated successfully!")

if __name__ == '__main__':
    config = load_config()
    update_html_files(config)
