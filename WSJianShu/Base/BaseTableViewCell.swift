//
//  BaseTableViewCell.swift
//  WSJianShu
//
//  Created by wangzhen on 16/9/21.
//  Copyright © 2016年 www.wackosix.cn. All rights reserved.
//

import UIKit
import SnapKit


class BaseTableViewCell: UITableViewCell {
    
//    func test() -> Void {
//        contentView.addSubview(self)
//    }
    
    lazy var topSepLine : UIView = {
        let view = ViewUtils.getSepLine()
        self.contentView.addSubview(view)
        view.snp.makeConstraints({ (make) in
            make.top.left.right.equalTo(self.contentView)
            make.height.equalTo(0.5)
        })
        return view
    }()
    
    lazy var bottomSepLine : UIView = {
        let view = ViewUtils.getSepLine()
        self.contentView.addSubview(view)
        view.snp.makeConstraints({ (make) in
            make.bottom.left.right.equalTo(self.contentView)
            make.height.equalTo(0.5)
        })
        return view
    }()
    
    
}
