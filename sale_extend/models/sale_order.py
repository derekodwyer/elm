# -*- coding: utf-8 -*-

from odoo import api, fields, models, _


class SaleOrder(models.Model):
	_inherit = "sale.order"

	kitchen_makers = fields.Char(string='Kitchen Makers name and contact number')
	type_of_material = fields.Char(string='Type Of Material and Thickness')
	position_of_flutes = fields.Char(string='Position Of flutes if Required')
	type_of_finish = fields.Char(string='Type Of Finish')
	type_of_sink = fields.Char(string='Type Of Sink')
	tap_hole_size = fields.Char(string='Tap Hole Size')
	hob_cut_size = fields.Char(string='Hob Cut Size')
	height_and_thickness = fields.Char(string='Height And Thickness of Upstands')
	is_there_hob = fields.Char(string='Is there hob splashback')
	window_board_size = fields.Char(string='Window board approx size')
	ramped_drainer = fields.Char(string='Ramped Drainer')
	approx_template_date = fields.Date(string='Approx Template Date')
	additional_info = fields.Text(string='Additional Information')
	notes = fields.Text(string="Notes")
	

	