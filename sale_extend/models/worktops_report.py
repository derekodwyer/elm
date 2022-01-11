#-*- coding:utf-8 -*-
from odoo import api, models, fields

class SaleWorktopsReport(models.AbstractModel):
	_name = 'report.sale_extend.sale_worktops_temp_id'
	_description = 'Sale Worktops Report'

	@api.model
	def _get_report_values(self, docids, data=None):
		docs = self.env['sale.order'].browse(docids)

		c_street,c_street2,c_city,c_state_id,c_zip_code,c_country = "","","","","",""

		if docs.company_id.street:
			c_street = docs.company_id.street
		if docs.company_id.street2:
			c_street2 = docs.company_id.street2
		if docs.company_id.state_id:
			c_state_id = docs.company_id.state_id.name
		if docs.company_id.zip:
			c_zip_code = docs.company_id.zip
		if docs.company_id.city:
			c_city = docs.company_id.city
		if docs.company_id.country_id:
			c_country = docs.company_id.country_id.name

		company_address = str(c_street)+' '+str(c_street2)+' '+str(c_city)+' '+str(c_state_id)+' '+str(c_zip_code)+' '+str(c_country)


		p_street,p_street2,p_city,p_state_id,p_zip_code,p_country = "","","","","",""

		if docs.partner_id.street:
			p_street = docs.partner_id.street
		if docs.partner_id.street2:
			p_street2 = docs.partner_id.street2
		if docs.partner_id.state_id:
			p_state_id = docs.partner_id.state_id.name
		if docs.partner_id.zip:
			p_zip_code = docs.partner_id.zip
		if docs.partner_id.city:
			p_city = docs.partner_id.city
		if docs.partner_id.country_id:
			p_country = docs.partner_id.country_id.name

		company_address = str(c_street)+' '+str(c_street2)+' '+str(c_city)+' '+str(c_state_id)+' '+str(c_zip_code)+' '+str(c_country)

		partner_address = str(p_street)+' '+str(p_street2)+' '+str(p_city)+' '+str(p_state_id)+' '+str(p_zip_code)+' '+str(p_country)


		
		return {
			'doc_ids': docids,
			'docs': docs,
			'company_address': company_address,
			'partner_address': partner_address,
			'doc_model': 'sale.order',
		
		}

