# -*- coding: utf-8 -*-

{
    'name': "Sale Extend And Report",
    'summary': """Sale Extend And Report""",
    'author': "odoo",
    'website': "http://www.odoo.com",
    'category': 'Sale',
    'version': '15.1',
    'depends': ['base','sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/sale_order.xml',
        'views/report.xml',
        'views/template.xml',
    ],
}
